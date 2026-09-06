/**
 * In-memory sliding window rate limiter and security helpers.
 *
 * Provides ultra-fast, zero-dependency protection against DoS, brute-force,
 * and quota exhaustion (e.g. Gemini LLM, Edge TTS, Feedback spam).
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired(now: number, maxWindowMs: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    const validTimestamps = record.timestamps.filter((ts) => now - ts < maxWindowMs);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = validTimestamps;
    }
  }
}

/**
 * Checks whether a given identifier (IP, userId, etc.) is allowed under the rate limit.
 *
 * @param key Unique key, e.g. `tts:${ip}` or `feedback:${userId}`
 * @param limit Maximum requests permitted in the window
 * @param windowMs Time window in milliseconds (e.g. 60_000 for 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  cleanupExpired(now, windowMs);

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }

  record.timestamps.push(now);

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetTime: now + windowMs,
  };
}

/**
 * Extracts the real client IP from incoming request headers.
 */
export function getClientIp(headers: Headers): string {
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const parts = xForwardedFor.split(',');
    if (parts[0]) return parts[0].trim();
  }

  return '127.0.0.1';
}

/**
 * Sanitizes user input string: strips dangerous HTML/script tags,
 * eliminates null bytes and control characters, and truncates to maxLength.
 */
export function sanitizeText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/\0/g, '') // remove null bytes
    .replace(/<[^>]*>?/gm, '') // strip HTML tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // control chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Escapes PostgREST ILIKE wildcard characters (% and _) to avoid wildcard DoS
 * or unexpected pattern matches.
 */
export function sanitizeLikePattern(pattern: string, maxLength = 80): string {
  if (!pattern || typeof pattern !== 'string') return '';
  return pattern
    .trim()
    .slice(0, maxLength)
    .replace(/[%_\\]/g, '\\$&');
}

/**
 * Resets the in-memory rate limit store. Useful for unit testing.
 */
export function _resetRateLimitStoreForTesting(): void {
  rateLimitStore.clear();
}
