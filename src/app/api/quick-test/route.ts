/**
 * quick-test/route.ts â€” Endpoint public du Visitor Quick Test.
 *
 * Funnel public illimitÃ© (mvp.md Â§2.2) : 1 PDF envoyÃ© â†’ score + insights.
 *
 * Pipeline de sÃ©curitÃ© appliquÃ© en ordre :
 *   1) Validation upload (type/size â€” 5 Mo PDF, magic-bytes).
 *   2) Extraction texte PDF.
 *   3) ðŸ”’ Guardrail sÃ©mantique (Â« est-ce vraiment un CV ? Â») â€” rejette les
 *      factures/payes avec un 422 exploitable cÃ´tÃ© UI.
 *   4) Analyse LLM (Gemini Flash â€” see llm.ts for the benchmarked model) â†’ fallback heuristique transparent.
 *   5) Tracking anonyme (quick_test_events) + rate-limiting lÃ©ger (non bloquant).
 *
 * ConformitÃ© :
 *   - Aucune donnÃ©e persistante cÃ´tÃ© backend (hors logs dâ€™audit anonymes).
 *   - Lâ€™IP est hachÃ©e HMAC-SHA256 serveur-only (jamais exposÃ©e au client).
 *   - Toutes les Ã©tapes sont synchrones (pas de file dâ€™attente) ; le fallback
 *     heuristique garantit une rÃ©ponse < 10 s mÃªme en cas dâ€™indisponibilitÃ© LLM.
 */

import { MAX_RESUME_FILE_SIZE_BYTES, formatBytes } from '@/lib/resume-validation';
import { PdfExtractionError, countWords, extractPdfText, isPdfBuffer } from '@/lib/quick-test/pdf-extract';
import { DocxExtractionError, extractDocxText, isDocxBuffer } from '@/lib/quick-test/docx-extract';
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

  // 1) Rate limiting (non bloquant â€” logguÃ© mais on laisse passer)
  const rateOk = await checkRateLimit(ip).catch(() => true);
  if (!rateOk) {
    console.warn(`[quick-test] Rate limit exceeded for ip_hash=${ip.slice(0, 3)}â€¦`);
  }

  // 2) Extraction du formulaire
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('RequÃªte invalide : impossible de lire le fichier envoyÃ©.', 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return errorResponse('Aucun fichier reÃ§u. DÃ©posez votre CV au format PDF ou Word.', 400);
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
    return errorResponse('Le fichier n’est pas un véritable PDF (signature invalide).', 422);
  }
  if (isDocx && !docxMagic) {
    await logQuickTestEvent({ eventType: 'upload', source: 'heuristic', ip, userAgent });
    return errorResponse('Le fichier n’est pas un véritable document Word (.docx) (signature invalide).', 422);
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
        : 'Impossible de lire ce document. Il est peut-Ãªtre corrompu.';
    return errorResponse(message, 422);
  }

  if (text.length === 0) {
    return errorResponse(
      'Aucun texte extractible : ce document semble Ãªtre un PDF scannÃ© (image) ou un Word contenant uniquement des images. Le test rapide nÃ©cessite un document textuel.',
      422
    );
  }

    // 5) Tracking de l'upload
  await logQuickTestEvent({ eventType: 'upload', source: 'heuristic', ip, userAgent });

  // 6) ðŸ”’ Guardrail sÃ©mantique â€” Â« est-ce vraiment un CV ? Â»
  console.time('[quick-test] Guardrail validation');
  const validation = await validateCvDocument(text);
  console.timeEnd('[quick-test] Guardrail validation');
  if (!validation.ok) {
    await logQuickTestEvent({
      eventType: 'rejected_non_cv',
      source: 'heuristic',
      score: null,
      ip,
      userAgent,
    });
    console.warn(`[quick-test] âŒ Non-CV rejetÃ© par le guardrail : ${validation.reason}`);
    return errorResponse(
      `Ce document ne semble pas Ãªtre un CV (${validation.reason}). Veuillez tÃ©lÃ©charger un curriculum vitÃ¦ valide.`,
      422
    );
  }
  console.info(`[quick-test] âœ… Document validÃ© comme CV (${validation.reason})`);

  // 7) Analyse LLM (Gemini) â†’ fallback heuristique transparent
  let analysis: QuickTestAnalysis | null = null;
  let source: QuickTestSource = 'heuristic';

  if (isLlmConfigured()) {
    console.time('[quick-test] LLM analysis');
    analysis = await analyzeWithGemini(text);
    console.timeEnd('[quick-test] LLM analysis');
    if (analysis) {
      source = 'llm';
    } else {
      console.warn(
        `[quick-test] âš  HEURISTIC FALLBACK â€” Gemini a Ã©chouÃ© pour un CV valide (texte: ${text.length} chars, pages: ${pageCount})`
      );
    }
  } else {
    console.warn('[quick-test] âš  HEURISTIC FALLBACK â€” GEMINI_API_KEY non configurÃ©.');
  }

  if (!analysis) {
    analysis = analyzeResumeText(text);
  }

  if (!analysis) {
    return errorResponse('Le contenu extrait est trop court pour produire une analyse fiable.', 422);
  }

  // 8) Tracking de l'analyse (succÃ¨s LLM vs fallback)
  await logQuickTestEvent({
    eventType: source === 'llm' ? 'analysis_success' : 'analysis_fallback',
    source,
    score: analysis.score ?? null,
    ip,
    userAgent,
  });

  // 9) RÃ©ponse â€” mÃªmes donnÃ©es mÃ©tier + header de vÃ©rifiabilitÃ©
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

  console.info(`[quick-test] âœ… RÃ©ponse envoyÃ©e â€” source=${source}, score=${analysis.score ?? 'N/A'}`);
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
