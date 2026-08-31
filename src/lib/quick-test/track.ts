/**
 * quick-test/track.ts — Tracking anonyme + taux de limitation du visitor Quick Test.
 *
 * Aucune donnée personnelle identifiable n’est collectée :
 * - l’adresse IP est hachée HMAC-SHA256 avec une clé serveur secrète
 *   (`IP_HASH_SECRET`) → jamais stockée ou loguée en clair ;
 * - les logs servent uniquement aux tableaux de bord admin (statistiques
 *   anonymes) et au rate-limiting léger (visiteur abusif).
 *
 * Toutes les fonctions sont non bloquantes : un échec d’écriture ne doit
 * jamais casser le parcours utilisateur.
 */

import { createClient } from '@/utils/supabase/server';
import { hashIp } from '@/lib/quick-test/utils';
import type { QuickTestSource } from '@/types/quick-test';

export type QuickTestEventType =
  | 'upload'
  | 'analysis_success'
  | 'analysis_fallback'
  | 'conversion_cta'
  | 'rejected_non_cv';

/**
 * Enregistre un événement de la funnel Quick Test.
 * Non bloquant : enveloppé en try/catch silencieux.
 */
export async function logQuickTestEvent(params: {
  eventType: QuickTestEventType;
  source: QuickTestSource;
  score?: number | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from('quick_test_events').insert({
      event_type: params.eventType,
      source: params.source,
      score: params.score ?? null,
      ip_hash: params.ip ? hashIp(params.ip) : undefined,
      user_agent: params.userAgent ?? null,
    });
  } catch (err) {
    // Tracking is best-effort : ne jamais casser le funnel principal.
    console.error('[track] quick_test_events insert failed:', (err as Error)?.message);
  }
}

/**
 * Vérifie la limite d’usage par IP sur les 24 dernières heures.
 * Retourne `true` si autorisé, `false` si la limite est dépassée.
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const ipHash = hashIp(ip);
    const limit = parseInt(process.env.QUICK_TEST_RATE_LIMIT || '30', 10);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('quick_test_events')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);

    if (error) {
      console.error('[track] rate-limit query failed:', error.message);
      return true; // on laisse passer en cas d’erreur (mode non bloquant)
    }

    return (count ?? 0) < limit;
  } catch (err) {
    console.error('[track] rate-limit check errored:', (err as Error)?.message);
    return true; // on laisse passer
  }
}
