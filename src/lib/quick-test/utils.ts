import { createHash } from 'node:crypto';

/**
 * Hache l’adresse IP avec une clé secrète serveur pour le respect du RGPD.
 * Retourne un identifiant anonyme stable par IP+clé, tronqué à 32 caractères.
 */
export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET || 'dev-only-insecure-secret-fallback';

  if (typeof window !== 'undefined') {
    // JAMAIS appelé côté client, mais défensif.
    throw new Error('hashIp must not run in the browser');
  }

  return createHash('sha256').update(`${ip}:${secret}`).digest('hex').slice(0, 32);
}
