/**
 * quick-test/route.ts — Endpoint public du Visitor Quick Test.
 *
 * Funnel public illimité (mvp.md §2.2) : 1 PDF envoyé → score + insights.
 *
 * Pipeline de sécurité appliqué en ordre :
 *   1) Validation upload (type/size — 5 Mo PDF/DOCX, magic-bytes).
 *   2) Extraction texte PDF/DOCX.
 *   3) Vérification que le texte est extractible (rejette les scans/images).
 *   4) Analyse LLM (Gemini Flash — see llm.ts for the benchmarked model) → fallback heuristique transparent.
 *   5) Tracking anonyme (quick_test_events) + rate-limiting bloquant (429).
 *
 * Conformité :
 *   - Aucune donnée persistante côté backend (hors logs d'audit anonymes).
 *   - L'IP est hachée HMAC-SHA256 serveur-only (jamais exposée au client).
 *   - Toutes les étapes sont synchrones (pas de file d'attente) ; le fallback
 *     heuristique garantit une réponse < 10 s même en cas d'indisponibilité LLM.
 */

import { MAX_RESUME_FILE_SIZE_BYTES, formatBytes } from '@/lib/resume-validation';
import { PdfExtractionError, countWords, extractPdfText, isPdfBuffer } from '@/lib/quick-test/pdf-extract';
import { DocxExtractionError, extractDocxText, isDocxBuffer } from '@/lib/quick-test/docx-extract';
import { analyzeWithGemini, isLlmConfigured } from '@/lib/quick-test/llm';
import { analyzeResumeText } from '@/lib/quick-test/analysis';
import { heuristicCvGate } from '@/lib/quick-test/guardrail';
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

  // 4) Extraction texte (PDF ou DOCX)
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
    console.timeEnd('[quick-test] Extraction');
  } catch (error) {
    console.timeEnd('[quick-test] Extraction');
    const message =
      error instanceof PdfExtractionError || error instanceof DocxExtractionError
        ? error.message
        : 'Impossible de lire ce document. Il est peut-être corrompu.';
    return errorResponse(message, 422);
  }

  if (text.length === 0) {
    const format = isPdf ? 'PDF' : 'DOCX';
    const suggestion =
      isPdf
        ? 'Ce PDF semble être un scan (image), pas un document textuel. Exportez-le depuis Word/Canva en « PDF texte » ou utilisez un générateur de CV texte.'
        : 'Ce document Word semble contenir uniquement des images. Exportez-le depuis Word au format PDF texte ou DOCX natif.';
    return errorResponse(
      `Aucun texte extractible : le ${format} ne contient pas de texte lisible. ${suggestion}`,
      422
    );
  }

  // 5) Tracking de l'upload
  await logQuickTestEvent({ eventType: 'upload', source: 'heuristic', ip, userAgent });

  // 6) Analyse LLM (Gemini) → fallback heuristique transparent.
  //    Le guardrail sémantique « est-ce un CV ? » est FUSIONNÉ dans l'appel
  //    LLM (champ `is_cv` du responseSchema — un seul appel, latence divisée
  //    par deux). Le filet heuristique (guardrail.ts) ne sert que lorsque le
  //    LLM est indisponible, afin qu'un résultat heuristique ne soit jamais
  //    présenté pour un document qui n'est pas un CV.
  let analysis: QuickTestAnalysis | null = null;
  let source: QuickTestSource = 'heuristic';

  if (isLlmConfigured()) {
    console.time('[quick-test] LLM analysis');
    const llmResult = await analyzeWithGemini(text);
    console.timeEnd('[quick-test] LLM analysis');
    if (llmResult) {
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
      analysis = llmResult.analysis;
      source = 'llm';
    } else {
      console.warn(
        `[quick-test] HEURISTIC FALLBACK — Gemini a echoue pour un CV valide (texte: ${text.length} chars, pages: ${pageCount})`
      );
    }
  } else {
    console.warn('[quick-test] HEURISTIC FALLBACK — GEMINI_API_KEY non configure.');
  }

  if (!analysis) {
    // Fallback heuristique : le filet sémantique local remplace le guardrail LLM.
    const gate = heuristicCvGate(text);
    if (!gate.ok) {
      await logQuickTestEvent({
        eventType: 'rejected_non_cv',
        source: 'heuristic',
        score: null,
        ip,
        userAgent,
      });
      return errorResponse(
        `Ce document ne semble pas être un CV (${gate.reason}). Veuillez télécharger un curriculum vitæ valide.`,
        422
      );
    }
    analysis = analyzeResumeText(text);
  }

  if (!analysis) {
    return errorResponse('Le contenu extrait est trop court pour produire une analyse fiable.', 422);
  }

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