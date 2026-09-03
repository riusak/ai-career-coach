/**
 * quick-test/route.ts — Endpoint public du Visitor Quick Test.
 *
 * Funnel public illimité (mvp.md §2.2) : 1 CV envoyé → score + insights.
 *
 * Pipeline de sécurité appliqué en ordre :
 *   1) Validation upload (type/size — 5 Mo PDF/DOCX, magic-bytes).
 *   2) Extraction texte légère (métadonnées uniquement).
 *   3) Analyse LLM — DOCUMENT NATIF : le PDF est envoyé tel quel à Gemini
 *      (inline_data multimodal) pour que le modèle évalue la vraie mise en
 *      page ; le DOCX part en texte extrait. AUCUN fallback heuristique :
 *      un échec LLM est une erreur visible (502), jamais un faux score.
 *   4) Tracking anonyme (quick_test_events) + rate-limiting bloquant (429).
 *
 * Conformité :
 *   - Aucune donnée persistante côté backend (hors logs d'audit anonymes).
 *   - L'IP est hachée HMAC-SHA256 serveur-only (jamais exposée au client).
 *   - Toutes les étapes sont synchrones (pas de file d'attente).
 */

import { MAX_RESUME_FILE_SIZE_BYTES, MAX_RESUME_TEXT_CHARS, formatBytes } from '@/lib/resume-validation';
import { PdfExtractionError, countWords, extractPdfText, isPdfBuffer } from '@/lib/quick-test/pdf-extract';
import { DocxExtractionError, extractDocxText, isDocxBuffer } from '@/lib/quick-test/docx-extract';
import { analyzeWithGemini, isLlmConfigured } from '@/lib/quick-test/llm';
import type { AnalysisDocumentMimeType } from '@/lib/quick-test/llm';
import { isIpHashSecretConfigured } from '@/lib/quick-test/utils';
import { logQuickTestEvent, checkRateLimit } from '@/lib/quick-test/track';
import type { QuickTestAnalysis, QuickTestResponse, QuickTestSource } from '@/types/quick-test';

export const runtime = 'nodejs';
export const maxDuration = 60;

function errorResponse(
  message: string,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function clientIp(request: Request): string {
  const h = request.headers;
  // `x-real-ip` est posé par la plateforme (Vercel/proxy inverse) depuis le
  // pair socket réel : il n'est PAS falsifiable par le client, contrairement à
  // `x-forwarded-for` (premier maillon chaînable). Les deux suivants ne sont
  // que des replis best-effort pour les déploiements self-hosted.
  const realIp = h.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  const cf = h.get('cf-connecting-ip');
  if (cf) {
    return cf.trim();
  }
  const xff = h.get('x-forwarded-for');
  return xff?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: Request): Promise<Response> {
  console.time('[quick-test] Total request');

  // 0) Fail-closed configuration guard (production only): without the HMAC
  //    secret, GDPR-compliant IP hashing AND the anti-abuse rate limiting
  //    cannot run — refuse to serve rather than run unprotected.
  if (process.env.NODE_ENV === 'production' && !isIpHashSecretConfigured()) {
    console.error('[quick-test] IP_HASH_SECRET missing in production — refusing to serve.');
    return errorResponse(
      'Service temporairement indisponible (configuration serveur incomplète).',
      500
    );
  }

  const ip = clientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  // 1) Rate limiting — BLOQUANT (429) : chaque analyse réussie engage le
  //    quota/facturation Gemini, l'endpoint ne peut plus rester un gouffre
  //    financier ouvert. Fail-open uniquement sur erreur technique du check.
  const rateOk = await checkRateLimit(ip).catch((err) => {
    console.error('[quick-test] rate-limit check failed (fail-open):', (err as Error)?.message);
    return true;
  });
  if (!rateOk) {
    console.warn(`[quick-test] ⛔ Rate limit exceeded for ip_hash-prefix=${ip.slice(0, 3)}...`);
    return errorResponse(
      'Trop de tests depuis cette adresse. Réessayez dans 24 heures.',
      429,
      { 'Retry-After': '86400' }
    );
  }

  // 2) Extraction du formulaire
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('Requête invalide : impossible de lire le fichier envoyé.', 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return errorResponse('Aucun fichier reçu. Déposez votre CV au format PDF ou Word.', 400);
  }

  // 3) Validation upload (PDF + DOCX + magic bytes)
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx');
  if (!isPdf && !isDocx) {
    await logQuickTestEvent({ eventType: 'upload', source: 'heuristic', ip, userAgent });
    return errorResponse('Le test rapide accepte uniquement les fichiers PDF et Word (.docx).', 415);
  }

  const pdfMagic = isPdfBuffer(buffer);
  const docxMagic = isDocxBuffer(buffer);
  if (isPdf && !pdfMagic) {
    await logQuickTestEvent({ eventType: 'upload', source: 'heuristic', ip, userAgent });
    return errorResponse('Le fichier n\'est pas un véritable PDF (signature invalide).', 422);
  }
  if (isDocx && !docxMagic) {
    await logQuickTestEvent({ eventType: 'upload', source: 'heuristic', ip, userAgent });
    return errorResponse('Le fichier n\'est pas un véritable document Word (.docx) (signature invalide).', 422);
  }

  if (buffer.length === 0) {
    return errorResponse('Le fichier est vide.', 400);
  }

  if (buffer.length > MAX_RESUME_FILE_SIZE_BYTES) {
    return errorResponse(
      `Fichier trop volumineux (${formatBytes(buffer.length)}). Maximum : ${formatBytes(MAX_RESUME_FILE_SIZE_BYTES)}.`,
      413
    );
  }

  // 4) Extraction texte légère — métadonnées uniquement (pageCount,
  //    wordCount, parsed guard). L'analyse elle-même part en DOCUMENT NATIF :
  //    un PDF (même scanné/image) est lisible par Gemini via inline_data, on
  //    ne rejette donc plus les PDF sans texte extractible. Le DOCX, lui,
  //    exige le texte (Gemini ne le lit pas nativement).
  let text: string;
  let pageCount: number;
  console.time('[quick-test] Extraction');
  try {
    if (isPdf) {
      const extraction = extractPdfText(buffer);
      text = extraction.text;
      pageCount = extraction.pageCount;
    } else {
      const extraction = await extractDocxText(buffer);
      text = extraction.text;
      pageCount = 1;
    }
  } catch (error) {
    if (!isPdf) {
      console.timeEnd('[quick-test] Extraction');
      const message =
        error instanceof DocxExtractionError
          ? error.message
          : 'Impossible de lire ce document. Il est peut-être corrompu.';
      return errorResponse(message, 422);
    }
    // PDF : seul un document structurellement illisible (chiffré) bloque ;
    // toute autre erreur d'extraction est tolérée — le PDF natif part tel
    // quel au modèle multimodal.
    if (error instanceof PdfExtractionError) {
      console.timeEnd('[quick-test] Extraction');
      return errorResponse(error.message, 422);
    }
    console.warn(
      '[quick-test] PDF text extraction failed — continuing with the native document for the multimodal analysis:',
      (error as Error)?.message
    );
    text = '';
    pageCount = 0;
  }
  console.timeEnd('[quick-test] Extraction');

  // Decompression-bomb / memory guard: cap the extracted text (metadata +
  // DOCX LLM input; 500k chars ≈ 80k words, no real CV exceeds it).
  if (text.length > MAX_RESUME_TEXT_CHARS) {
    console.warn(`[quick-test] Extracted text capped: ${text.length} → ${MAX_RESUME_TEXT_CHARS} chars.`);
    text = text.slice(0, MAX_RESUME_TEXT_CHARS);
  }

  // 5) Tracking de l'upload
  await logQuickTestEvent({ eventType: 'upload', source: 'heuristic', ip, userAgent });

  // 6) Analyse LLM — DOCUMENT NATIF, AUCUN fallback heuristique.
  //    PDF : envoyé tel quel (inline_data) pour que le modèle évalue la vraie
  //    mise en page. DOCX : texte extrait embarqué dans le prompt.
  //    Le guardrail sémantique « est-ce un CV ? » reste FUSIONNÉ dans l'appel
  //    LLM (champ `is_cv` du responseSchema — un seul appel).
  if (!isLlmConfigured()) {
    console.error('[quick-test] GEMINI_API_KEY non configurée — analyse impossible (pas de fallback heuristique).');
    return errorResponse(
      "Le service d'analyse IA est momentanément indisponible (configuration serveur incomplète).",
      503
    );
  }

  const mimeType: AnalysisDocumentMimeType = isPdf
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  console.time('[quick-test] LLM analysis');
  const llmResult = await analyzeWithGemini({ buffer, mimeType, text });
  console.timeEnd('[quick-test] LLM analysis');

  if (!llmResult) {
    // Explicit failure — never a fake heuristic score.
    console.error(
      `[quick-test] LLM analysis FAILED for a valid upload (${buffer.length} bytes, pages: ${pageCount}) — returning 502.`
    );
    await logQuickTestEvent({
      // `analysis_fallback` (whitelist DB migration 006) now means "the LLM
      // did not deliver" — the heuristic fallback it used to describe no
      // longer exists.
      eventType: 'analysis_fallback',
      source: 'llm',
      score: null,
      ip,
      userAgent,
    });
    return errorResponse(
      "L'analyse IA n'a pas abouti après plusieurs tentatives (service momentanément saturé ou indisponible). Veuillez relancer l'analyse.",
      502
    );
  }

  if (!llmResult.gate.isCv) {
    console.warn(
      `[quick-test] ❌ Non-CV rejeté par le guardrail LLM (type=${llmResult.gate.documentType}, langue=${llmResult.gate.detectedLanguage})`
    );
    await logQuickTestEvent({
      eventType: 'rejected_non_cv',
      source: 'heuristic',
      score: null,
      ip,
      userAgent,
    });
    return errorResponse(
      `Ce document ne semble pas être un CV (type détecté : ${llmResult.gate.documentType}). Veuillez télécharger un curriculum vitæ valide.`,
      422
    );
  }

  const analysis: QuickTestAnalysis = llmResult.analysis;
  const source: QuickTestSource = 'llm';

  // 8) Tracking de l'analyse (succes LLM vs fallback)
  await logQuickTestEvent({
    eventType: source === 'llm' ? 'analysis_success' : 'analysis_fallback',
    source,
    score: analysis.score ?? null,
    ip,
    userAgent,
  });

  // 9) Reponse — memes donnees metier + header de verificabilite
  const response: QuickTestResponse = {
    metadata: {
      fileName: file.name,
      fileSizeBytes: buffer.length,
      pageCount,
      wordCount: countWords(text),
    },
    analysis,
    source,
  };

  console.info(`[quick-test] Reponse envoyee — source=${source}, score=${analysis.score ?? 'N/A'}`);
  console.timeEnd('[quick-test] Total request');

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Quick-Test-Source': source,
      'Cache-Control': 'no-store',
    },
  });
}