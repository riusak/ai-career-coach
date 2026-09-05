/**
 * quick-test/route.ts — Endpoint public du Visitor Quick Test.
 *
 * ⚠️ ARCHITECTURE (2026-09) : cette route est désormais un ADAPTATEUR
 * HTTP MINCE. Toute la logique de validation / extraction / analyse LLM
 * vit dans `src/lib/analysis/pipeline.ts` — le module partagé UNIQUE avec la
 * route authentifiée `/api/resume/analyze`. Il n'y a qu'UN seul pipeline, donc
 * chaque document bénéficie exactement de la même logique stable, quelle que
 * soit sa provenance (visiteur anonyme ou utilisateur connecté). Cela
 * supprime toute divergence entre parcours (y compris les 502 erratiques
 * que provoquait l'ancienne logique dupliquée).
 *
 * Responsibilities de cet adaptateur (spécifiques au funnel public):
 *   1) Fail-closed config guard (IP_HASH_SECRET) + rate-limiting bloquant;
 *   2) Parsing multipart (fichier unique);
 *   3) Délégation au pipeline partagé (`analyzeCvDocument`, PDF/DOCX only);
 *   4) Tracking anonyme (`quick_test_events`) + mapping des erreurs
 *      machine-readable du pipeline vers la réponse HTTP.
 *
 * Conformité :
 *   - Aucune donnée persistante côté backend (hors logs d'audit anonymes);
 *   - L'IP est hachée HMAC-SHA256 serveur-only (jamais exposée au client);
 *   - Toutes les étapes sont synchrones (pas de file d'attente).
 */

import type { AnalysisStage } from '@/lib/analysis/pipeline';
import { analyzeCvDocument } from '@/lib/analysis/pipeline';
import type { QuickTestDocumentKind, QuickTestErrorCode } from '@/lib/quick-test/error-codes';
import { clientIpFromHeaders, isIpHashSecretConfigured } from '@/lib/quick-test/utils';
import { checkRateLimit, logQuickTestEvent } from '@/lib/quick-test/track';
import type { QuickTestResponse } from '@/types/quick-test';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Kinds acceptés par le funnel public (PDF/DOCX — pas de TXT). */
const PUBLIC_FUNNEL_KINDS: readonly QuickTestDocumentKind[] = ['pdf', 'docx'];

/** Codes de validation « format » logués comme événement `upload` par la funnel. */
const UPLOAD_EVENT_REJECTION_CODES: ReadonlySet<string> = new Set([
  'unsupported_format',
  'invalid_pdf',
  'invalid_docx',
]);

/** Codes signifiant que le document a atteint le stade LLM (upload logué, plus l'événement terminal). */
const LLM_REACHED_CODES: ReadonlySet<string> = new Set([
  'not_a_cv',
  'llm_failed',
  'llm_unavailable',
]);

interface ErrorOptions {
  code: QuickTestErrorCode;
  documentType?: string;
  documentKind?: QuickTestDocumentKind;
  extraHeaders?: Record<string, string>;
}

function errorResponse(message: string, status: number, options: ErrorOptions): Response {
  return new Response(
    JSON.stringify({
      error: message,
      code: options.code,
      ...(options.documentType ? { documentType: options.documentType } : {}),
      ...(options.documentKind ? { documentKind: options.documentKind } : {}),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...(options.extraHeaders ?? {}) },
    }
  );
}

export async function POST(request: Request): Promise<Response> {
  // 1) Fail-closed configuration guard (production only): without the HMAC
  //    secret, GDPR-compliant IP hashing and rate-limiting cannot run.

  if (!isIpHashSecretConfigured()) {
    console.error('[quick-test] IP_HASH_SECRET missing in production — refusing to serve.');
    return errorResponse(
      'Configuration serveur incomplète : la variable IP_HASH_SECRET est requise en production (anonymisation des IP / RGPD).',
      500,
      { code: 'server_error' }
    );
  }

  const ip = clientIpFromHeaders(request.headers);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  // 2) Rate-limiting bloquant (anti-abus du pipeline IA).
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    console.warn(`[quick-test] Rate limit exceeded for IP hash ${ip.slice(0, 8)}…`);
    return errorResponse(
      'Trop de tests depuis cette adresse. Réessayez dans 24 heures.',
      429,
      { code: 'rate_limited', extraHeaders: { 'Retry-After': '86400' } }
    );
  }

  // 3) Parsing multipart (fichier unique).
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('Requête invalide : impossible de lire le fichier envoyé.', 400, {
      code: 'server_error',
    });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return errorResponse('Aucun fichier reçu. Déposez votre CV au format PDF ou Word.', 400, {
      code: 'file_empty',
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 4) Pipeline d'analyse UNIQUE partagé (validation → extraction → LLM →
  //    guardrail CV). Cette route ne contient PLUS aucune règle de validation
  //    ni d'appel LLM: tout vit dans `src/lib/analysis/pipeline.ts`.
  //
  //    Synchronisation UI ↔ pipeline : au lieu de renvoyer une réponse JSON
  //    unique à la fin, on diffuse en flux NDJSON (`application/ndjson`) en
  //    temps réel. Chaque stade du pipeline (`reading` → `analyzing` →
  //    `reporting`) est émis comme ligne `progress` — le funnel client fait
  //    défiler son « billet d'attente » en vrai-temps sur les vrais appels
  //    (lecture multimodale, parsing sémantique / scoring LLM, génération du
  //    rapport), sans blocage factice sur l'étape 1. Une ligne terminale
  //    `result` (ou `error`) porte le rapport ou l'erreur machine.
  // Chronométrage démarré après les gardes précoces : tout chemin qui atteint
  // le flux termine le timer dans son `finally` — aucun `console.timeEnd`
  // orphelin sur les retours anticipés (guard / rate-limit / parsing).
  console.time('[quick-test] Total request');

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (message: unknown): void => {
        controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`));
      };

      // Relaie chaque stade du pipeline vers le client sous forme de ligne
      // `progress`, en plus du suivi d'audit ci-dessous.
      const onStage = (stage: AnalysisStage): void => {
        write({ type: 'progress', stage });
      };

      try {
        const pipelineResult = await analyzeCvDocument({
          buffer,
          fileName: file.name,
          declaredMimeType: file.type,
          allowedDocumentKinds: PUBLIC_FUNNEL_KINDS,
          onStage,
        });

        if (pipelineResult.ok) {
          // 5) Tracking anonyme de la funnel (non bloquant — les helpers sont
          //    try/catch silencieux et ne cassent jamais le parcours). Un
          //    fichier analysé avec succès génère `upload` PUIS
          //    `analysis_success` — parité avec les chemins d'échec, métrique
          //    admin `upload` fidèle. Convention `source` de la migration 006 :
          //    'none' pour les événements sans moteur d'analyse.
          await logQuickTestEvent({
            eventType: 'upload',
            source: 'none',
            ip,
            userAgent,
          });
          await logQuickTestEvent({
            eventType: 'analysis_success',
            source: pipelineResult.source,
            score: pipelineResult.analysis.score ?? null,
            ip,
            userAgent,
          });

          const result: QuickTestResponse = {
            metadata: {
              fileName: file.name,
              fileSizeBytes: buffer.length,
              pageCount: pipelineResult.pageCount,
              wordCount: pipelineResult.wordCount,
            },
            analysis: pipelineResult.analysis,
            source: pipelineResult.source,
          };

          console.info(
            `[quick-test] Réponse envoyée — source=${result.source}, score=${result.analysis.score ?? 'N/A'}`,
          );
          // Ligne terminale : le client remplace le squelette par le rapport.
          write({ type: 'result', ...result });
        } else {
          const { error } = pipelineResult;
          // 5) Tracking : tout document atteignant la validation ou le LLM génère
          //    un événement `upload` ; les échecs terminaux enregistrent
          //    `rejected_non_cv` / `analysis_fallback` (mapping historique).
          if (
            UPLOAD_EVENT_REJECTION_CODES.has(error.code) ||
            LLM_REACHED_CODES.has(error.code)
          ) {
            await logQuickTestEvent({
              eventType: 'upload',
              source: 'none',
              ip,
              userAgent,
            });
          }
          if (error.code === 'not_a_cv') {
            await logQuickTestEvent({
              eventType: 'rejected_non_cv',
              source: 'none',
              score: null,
              ip,
              userAgent,
            });
          } else if (error.code === 'llm_failed') {
            await logQuickTestEvent({
              eventType: 'analysis_fallback',
              source: 'llm',
              score: null,
              ip,
              userAgent,
            });
          }

          // Ligne terminale : `code`/`documentType`/`documentKind` pilotent la
          // modale de rejet précise côté client.
          write({
            type: 'error',
            error: error.message,
            code: error.code,
            ...(error.documentType ? { documentType: error.documentType } : {}),
            ...(error.documentKind ? { documentKind: error.documentKind } : {}),
          });
        }
      } catch (error) {
        // Erreur inattendue du pipeline (ex. extracteur qui plante) : on
        // délivre une ligne `error` au lieu de laisser le flux s'interrompre
        // sans message terminal (ce qui bloquerait le funnel).
        const message = error instanceof Error ? error.message : String(error);
        console.error('[quick-test] Pipeline en échec inattendu:', message);
        try {
          write({ type: 'error', error: message, code: 'server_error' });
        } catch {
          // Stream already errored (client disconnected) — nothing to do.
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed or errored.
        }
        console.timeEnd('[quick-test] Total request');
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
