import { createHash } from 'node:crypto';

let warnedInsecureFallback = false;

/**
 * True when the HMAC secret for IP anonymization is configured. In production
 * the quick-test route refuses to run without it (fail-closed) — a missing
 * secret would silently disable both GDPR-compliant hashing and anti-abuse
 * rate limiting.
 */
export function isIpHashSecretConfigured(): boolean {
  return Boolean(process.env.IP_HASH_SECRET);
}

/**
 * Hache l’adresse IP avec une clé secrète serveur pour le respect du RGPD.
 * Retourne un identifiant anonyme stable par IP+clé, tronqué à 32 caractères.
 *
 * Fail-closed en production : sans `IP_HASH_SECRET`, la fonction lève (l'appelant
 * traite l'erreur comme un échec technique). En développement, un repli
 * déterministe mais INSECURE est utilisé, signalé une seule fois par process.
 */
export function hashIp(ip: string): string {
  if (typeof window !== 'undefined') {
    // JAMAIS appelé côté client, mais défensif.
    throw new Error('hashIp must not run in the browser');
  }

  const secret = process.env.IP_HASH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'IP_HASH_SECRET is missing in production — refusing to hash IPs with an insecure fallback.'
      );
    }
    if (!warnedInsecureFallback) {
      warnedInsecureFallback = true;
      console.warn(
        '[track] IP_HASH_SECRET not set — using an INSECURE dev-only fallback (never ship this to production).'
      );
    }
    return createHash('sha256').update(`${ip}:dev-only-insecure-secret-fallback`).digest('hex').slice(0, 32);
  }

  return createHash('sha256').update(`${ip}:${secret}`).digest('hex').slice(0, 32);
}
