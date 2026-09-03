/**
 * quick-test/cta/route.ts — enregistre un clic sur le CTA d'inscription de la
 * modale de conversion (affichée après un Quick Test réussi).
 *
 * Endpoint volontairement minimal :
 *   - aucun body, aucune donnée personnelle (IP hachée HMAC côté serveur) ;
 *   - réponse toujours 204 — le client est fire-and-forget ;
 *   - fail-closed en production sans `IP_HASH_SECRET` (posture de la funnel) ;
 *   - anti-flood : 10 événements max / IP / 24 h (au-delà : no-op silencieux).
 * Le plafonnement ne consomme PAS le quota d'analyses (le rate limiter ne
 * compte que les événements d'analyse — voir `RATE_LIMITED_EVENT_TYPES`).
 */

import {
  clientIpFromHeaders,
  isIpHashSecretConfigured,
} from '@/lib/quick-test/utils';
import { logConversionCtaEvent } from '@/lib/quick-test/track';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  if (!isIpHashSecretConfigured()) {
    return new Response(null, { status: 204 });
  }

  const ip = clientIpFromHeaders(request.headers);
  const userAgent = request.headers.get('user-agent') ?? undefined;
  await logConversionCtaEvent({ ip, userAgent });

  return new Response(null, { status: 204 });
}
