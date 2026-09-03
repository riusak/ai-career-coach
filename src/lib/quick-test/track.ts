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
 * Valeur stockée dans `quick_test_events.source` (convention documentée par la
 * migration 006) : le moteur d'analyse ('llm' | 'heuristic') pour les
 * événements d'analyse, 'none' pour les événements qui n'en transportent pas
 * (upload / conversion_cta / rejected_non_cv).
 */
export type QuickTestEventSource = QuickTestSource | 'none';

/**
 * Enregistre un événement de la funnel Quick Test.
 * Non bloquant : enveloppé en try/catch silencieux.
 */
export async function logQuickTestEvent(params: {
  eventType: QuickTestEventType;
  source: QuickTestEventSource;
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
/**
 * Vérifie la limite d’usage par IP sur les 24 dernières heures.
 * Retourne `true` si autorisé, `false` si la limite est dépassée.
 *
 * Seuls les événements liés à une analyse consomment le quota : un clic CTA
 * (conversion_cta) ou tout futur événement non-analyse ne doit jamais priver
 * un visiteur de son test gratuit.
 */
const RATE_LIMITED_EVENT_TYPES: readonly QuickTestEventType[] = [
  'upload',
  'analysis_success',
  'analysis_fallback',
  'rejected_non_cv',
];

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
      .in('event_type', [...RATE_LIMITED_EVENT_TYPES])
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

/** Plafond anti-flood de clics CTA par IP / 24 h (au-delà : no-op silencieux). */
const MAX_CONVERSION_CTA_PER_DAY = 10;

/**
 * Enregistre un clic sur le CTA d'inscription (modale de conversion affichée
 * après un Quick Test réussi). Plafonné par IP / 24 h pour qu'un client ne
 * puisse pas inonder la table. Best-effort : ne lève jamais.
 */
export async function logConversionCtaEvent(params: {
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    if (!params.ip) {
      return;
    }
    const supabase = await createClient();
    const ipHash = hashIp(params.ip);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('quick_test_events')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('event_type', 'conversion_cta')
      .gte('created_at', since);

    if (error) {
      console.error('[track] conversion_cta count failed:', error.message);
      return;
    }
    if ((count ?? 0) >= MAX_CONVERSION_CTA_PER_DAY) {
      return; // no-op silencieux (anti-flood)
    }

    await supabase.from('quick_test_events').insert({
      event_type: 'conversion_cta',
      source: 'none',
      score: null,
      ip_hash: ipHash,
      user_agent: params.userAgent ?? null,
    });
  } catch (err) {
    console.error('[track] conversion_cta insert failed:', (err as Error)?.message);
  }
}
