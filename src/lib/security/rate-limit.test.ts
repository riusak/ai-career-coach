import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  getClientIp,
  sanitizeText,
  sanitizeLikePattern,
  _resetRateLimitStoreForTesting,
} from './rate-limit';

describe('rate-limit utility', () => {
  beforeEach(() => {
    _resetRateLimitStoreForTesting();
  });

  it('allows requests within the limit', () => {
    const key = 'test-ip';
    const limit = 3;
    const windowMs = 1000;

    const r1 = checkRateLimit(key, limit, windowMs);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, limit, windowMs);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, limit, windowMs);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    const r4 = checkRateLimit(key, limit, windowMs);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it('differentiates keys', () => {
    const limit = 1;
    const windowMs = 1000;

    expect(checkRateLimit('user-a', limit, windowMs).allowed).toBe(true);
    expect(checkRateLimit('user-a', limit, windowMs).allowed).toBe(false);
    expect(checkRateLimit('user-b', limit, windowMs).allowed).toBe(true);
  });

  it('extracts client IP correctly', () => {
    const h1 = new Headers({ 'cf-connecting-ip': '1.2.3.4' });
    expect(getClientIp(h1)).toBe('1.2.3.4');

    const h2 = new Headers({ 'x-real-ip': '5.6.7.8' });
    expect(getClientIp(h2)).toBe('5.6.7.8');

    const h3 = new Headers({ 'x-forwarded-for': '9.10.11.12, 13.14.15.16' });
    expect(getClientIp(h3)).toBe('9.10.11.12');

    const h4 = new Headers();
    expect(getClientIp(h4)).toBe('127.0.0.1');
  });

  it('sanitizes text properly and strips HTML tags', () => {
    const dirty = '<script>alert("xss")</script>Hello <b>World</b>!';
    expect(sanitizeText(dirty, 100)).toBe('alert("xss")Hello World!');
  });

  it('truncates text to specified length', () => {
    expect(sanitizeText('1234567890', 5)).toBe('12345');
  });

  it('escapes like patterns for SQL/PostgREST safety', () => {
    expect(sanitizeLikePattern('100% discount_deal')).toBe('100\\% discount\\_deal');
  });
});
