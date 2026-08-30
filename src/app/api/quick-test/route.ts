import {
  MAX_RESUME_FILE_SIZE_BYTES,
  formatBytes,
} from '@/lib/resume-validation';
import {
  PdfExtractionError,
  countWords,
  extractPdfText,
} from '@/lib/quick-test/pdf-extract';
import { analyzeResumeText } from '@/lib/quick-test/analysis';
import {
  analyzeWithGemini,
  isLlmConfigured,
} from '@/lib/quick-test/llm';
import type { QuickTestAnalysis, QuickTestResponse } from '@/types/quick-test';

/**
 * Visitor Quick Test — ephemeral LLM CV analysis (docs/product/mvp.md §2).
 *
 * Accepts a multipart form with a single `file` field. Nothing is persisted:
 * the file lives only for the duration of the request and the result is
 * returned as JSON (lifecycle = the client session). Visitor mode accepts
 * PDF only, up to 5 MB, mirroring the `resumes` bucket constraints.
 *
 * The extracted text is sent to Google Gemini when GEMINI_API_KEY is set;
 * on failure (or without a key) the deterministic heuristic analyzer keeps
 * the funnel functional. Either way, nothing is stored.
 */

export const runtime = 'nodejs';

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
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

  // Visitor mode: PDF only (mvp.md §2.2), consistent with the resumes bucket.
  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return errorResponse(
      'Le test rapide accepte uniquement les fichiers PDF (5 Mo maximum).',
      415
    );
  }

  if (file.size <= 0) {
    return errorResponse('Le fichier est vide.', 400);
  }
  if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
    return errorResponse(
      `Fichier trop volumineux (${formatBytes(file.size)}). Maximum : ${formatBytes(
        MAX_RESUME_FILE_SIZE_BYTES
      )}.`,
      413
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extraction;
  try {
    extraction = extractPdfText(buffer);
  } catch (error) {
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

  // LLM first (Gemini), deterministic heuristic as fallback. Both are pure
  // request-lifetime computations — no database or storage writes anywhere.
  let analysis: QuickTestAnalysis | null = null;
  let source: QuickTestResponse['source'] = 'heuristic';

  if (isLlmConfigured()) {
    analysis = await analyzeWithGemini(extraction.text);
    if (analysis) {
      source = 'llm';
    }
  }

  if (!analysis) {
    analysis = analyzeResumeText(extraction.text);
  }

  if (!analysis) {
    return errorResponse(
      'Le contenu extrait est trop court pour produire une analyse fiable.',
      422
    );
  }

  const response: QuickTestResponse = {
    metadata: {
      fileName: file.name,
      fileSizeBytes: file.size,
      pageCount: extraction.pageCount,
      wordCount: countWords(extraction.text),
    },
    analysis,
    source,
  };

  return Response.json(response);
}