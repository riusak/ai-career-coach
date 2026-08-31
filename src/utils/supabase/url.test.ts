import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseEnv, normalizeSupabaseUrl } from '@/utils/supabase/url';

describe('normalizeSupabaseUrl', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves a clean project URL untouched', () => {
    expect(normalizeSupabaseUrl('https://bouuycaqzekrymdeswcf.supabase.co')).toBe(
      'https://bouuycaqzekrymdeswcf.supabase.co'
    );
  });

  it('strips a trailing slash', () => {
    expect(normalizeSupabaseUrl('https://bouuycaqzekrymdeswcf.supabase.co/')).toBe(
      'https://bouuycaqzekrymdeswcf.supabase.co'
    );
  });

  it.each([
    '/rest/v1',
    '/auth/v1',
    '/storage/v1',
    '/functions/v1',
    '/realtime/v1',
    '/graphql/v1',
  ])('strips the %s service sub-path (root cause of PGRST125)', (suffix) => {
    expect(
      normalizeSupabaseUrl(`https://bouuycaqzekrymdeswcf.supabase.co${suffix}`)
    ).toBe('https://bouuycaqzekrymdeswcf.supabase.co');
  });

  it('strips a doubled service sub-path (/rest/v1/rest/v1)', () => {
    expect(
      normalizeSupabaseUrl('https://bouuycaqzekrymdeswcf.supabase.co/rest/v1/rest/v1')
    ).toBe('https://bouuycaqzekrymdeswcf.supabase.co');
  });

  it('strips a mixed doubled service sub-path (/rest/v1/auth/v1)', () => {
    expect(
      normalizeSupabaseUrl('https://bouuycaqzekrymdeswcf.supabase.co/rest/v1/auth/v1')
    ).toBe('https://bouuycaqzekrymdeswcf.supabase.co');
  });

  it('strips a service sub-path followed by a trailing slash', () => {
    expect(
      normalizeSupabaseUrl('https://bouuycaqzekrymdeswcf.supabase.co/rest/v1/')
    ).toBe('https://bouuycaqzekrymdeswcf.supabase.co');
  });

  it('preserves scheme and port for self-hosted Supabase', () => {
    expect(normalizeSupabaseUrl('http://localhost:54321')).toBe('http://localhost:54321');
    expect(normalizeSupabaseUrl('http://localhost:54321/auth/v1')).toBe('http://localhost:54321');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeSupabaseUrl('  https://bouuycaqzekrymdeswcf.supabase.co  ')).toBe(
      'https://bouuycaqzekrymdeswcf.supabase.co'
    );
  });

  it('throws on malformed values instead of building a bogus endpoint', () => {
    expect(() => normalizeSupabaseUrl('not-a-url')).toThrow(/Invalid NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => normalizeSupabaseUrl('bouuycaqzekrymdeswcf.supabase.co')).toThrow(
      /Invalid NEXT_PUBLIC_SUPABASE_URL/
    );
    expect(() => normalizeSupabaseUrl('https://')).toThrow(/Invalid NEXT_PUBLIC_SUPABASE_URL/);
  });
});

describe('getSupabaseEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns the sanitized URL and anon key when configured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bouuycaqzekrymdeswcf.supabase.co/rest/v1';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const { url, anonKey } = getSupabaseEnv();
    expect(url).toBe('https://bouuycaqzekrymdeswcf.supabase.co');
    expect(anonKey).toBe('anon-key');
  });

  it('throws when the environment is not configured', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => getSupabaseEnv()).toThrow(/Supabase is not configured/);
  });
});