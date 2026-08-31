/**
 * quick-test/route.ts — Endpoint public du Visitor Quick Test.
 *
 * Funnel public illimité (mvp.md §2.2) : 1 PDF envoyé → score + insights.
 *
 * Pipeline de sécurité appliqué en ordre :
 *   1) Validation upload (type/size — 5 Mo PDF, magic-bytes).
 *   2) Extraction texte PDF.
 *   3) 🔒 Guardrail sémantique (« est-ce vraiment un CV ? ») — rejette les
 *      factures/payes avec un 422 exploitable côté UI.
 *   4) Analyse LLM (Gemini 2.5-flash) → fallback heuristique transparent.
 *   5) Tracking anonyme (quick_test_events) + rate-limiting léger (non bloquant).
 *
 * Conformité :
 *   - Aucune donnée persistante côté backend (hors logs d’audit anonymes).
 *   - L’IP est hachée HMAC-SHA256 serveur-only (jamais exposée au client).
 *   - Toutes les étapes sont synchrones (pas de file d’attente) ; le fallback
 *     heuristique garantit une réponse < 10 s même en cas d’indisponibilité LLM.
 */

import { MAX_RESUME_FILE_SIZE_BYTES, formatBytes } from '@/lib/resume-validation';
import { PdfExtractionError, countWords, extractPdfText, isPdfBuffer } from '@/lib/quick-test/pdf-extract';
import { analyzeWithGemini, isLlmConfigured } from '@/lib/quick-test/llm';
import { analyzeResumeText } from '@/lib/quick-test/analysis';
import { validateCvDocument } from '@/lib/quick-test/guardrail';
import { logQuickTestEvent, checkRateLimit } from '@/lib/quick-test/track';
import type { QuickTestAnalysis, QuickTestResponse, QuickTestSource } from '@/types/quick-test';

export const runtime = 'nodejs';
export const maxDuration = 60;

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clientIp(request: Request): string {
  const h = (request as Request & { headers: Headers }).headers;
  const xff = h.get('x-forwarded-for');
  const cf = h.get('cf-connecting-ip');
  return xff?.split(',')[0]?.trim() || cf || 'unknown';
}

export async function POST(request: Request): Promise<Response> {
  console.time('[quick-test] Total request');
  const ip = clientIp(request);
  const userAgent = (request as Request & { headers: Headers }).headers.get('user-agent') || undefined;

  // 1) Rate limiting (non bloquant — loggué mais on laisse passer)
  const rateOk = await checkRateLimit(ip).catch(() => true);
  if (!rateOk) {
    console.warn(`[quick-test] Rate limit exceeded for ip_hash=${ip.slice(0, 3)}…`);
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
    return errorResponse('Aucun fichier reçu. Déposez votre CV au format PDF.', 400);
  }

  // 3) Validation upload (PDF + magic bytes)
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    await logQuickTestEvent({ eventType: 'upload', source: 'heuristic', ip, userAgent });
    return errorResponse('Le test rapide accepte uniquement les fichiers PDF.', 415);
  }

  if (!isPdfBuffer(buffer)) {
    await logQuickTestEvent({ eventType: 'upload', source: 'heuristic', ip, userAgent });
    return errorResponse('Le fichier n’est pas un véritable PDF (signature magic bytes invalide).', 422);
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

  // 4) Extraction texte
  let extraction;
  console.time('[quick-test] PDF extraction');
  try {
    extraction = extractPdfText(buffer);
    console.timeEnd('[quick-test] PDF extraction');
  } catch (error) {
    console.timeEnd('[quick-test] PDF extraction');
    const message =
      error instanceof PdfExtractionError
        ? error.message
        : 'Impossible de lire ce PDF. Il est peut-être corrompu.';
    return errorResponse(message, 422);
  }

  if (extraction.text.length === 0) {
    return errorResponse(
      'Aucun texte extractible : ce PDF semble être un document scanné (image). Le test rapide nécessite un PDF textuel.',
      422
    );
  }

    // 5) Tracking de l'upload
  await logQuickTestEvent({ eventType: 'upload', source: 'heuristic', ip, userAgent });

  // 6) 🔒 Guardrail sémantique — « est-ce vraiment un CV ? »
  console.time('[quick-test] Guardrail validation');
  const validation = await validateCvDocument(extraction.text);
  console.timeEnd('[quick-test] Guardrail validation');
  if (!validation.ok) {
    await logQuickTestEvent({
      eventType: 'rejected_non_cv',
      source: 'heuristic',
      score: null,
      ip,
      userAgent,
    });
    console.warn(`[quick-test] ❌ Non-CV rejeté par le guardrail : ${validation.reason}`);
    return errorResponse(
      `Ce document ne semble pas être un CV (${validation.reason}). Veuillez télécharger un curriculum vitæ valide.`,
      422
    );
  }
  console.info(`[quick-test] ✅ Document validé comme CV (${validation.reason})`);

  // 7) Analyse LLM (Gemini) → fallback heuristique transparent
  let analysis: QuickTestAnalysis | null = null;
  let source: QuickTestSource = 'heuristic';

  if (isLlmConfigured()) {
    console.time('[quick-test] LLM analysis');
    analysis = await analyzeWithGemini(extraction.text);
    console.timeEnd('[quick-test] LLM analysis');
    if (analysis) {
      source = 'llm';
    } else {
      console.warn(
        `[quick-test] ⚠ HEURISTIC FALLBACK — Gemini a échoué pour un CV valide (texte: ${extraction.text.length} chars, pages: ${extraction.pageCount})`
      );
    }
  } else {
    console.warn('[quick-test] ⚠ HEURISTIC FALLBACK — GEMINI_API_KEY non configuré.');
  }

  if (!analysis) {
    analysis = analyzeResumeText(extraction.text);
  }

  if (!analysis) {
    return errorResponse('Le contenu extrait est trop court pour produire une analyse fiable.', 422);
  }

  // 8) Tracking de l'analyse (succès LLM vs fallback)
  await logQuickTestEvent({
    eventType: source === 'llm' ? 'analysis_success' : 'analysis_fallback',
    source,
    score: analysis.score ?? null,
    ip,
    userAgent,
  });

  // 9) Réponse — mêmes données métier + header de vérifiabilité
  const response: QuickTestResponse = {
    metadata: {
      fileName: file.name,
      fileSizeBytes: buffer.length,
      pageCount: extraction.pageCount,
      wordCount: countWords(extraction.text),
    },
    analysis,
    source,
  };

  console.info(`[quick-test] ✅ Réponse envoyée — source=${source}, score=${analysis.score ?? 'N/A'}`);
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
