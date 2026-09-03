// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashIp, isIpHashSecretConfigured } from '@/lib/quick-test/utils';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isIpHashSecretConfigured', () => {
  it('reflects the presence of IP_HASH_SECRET', () => {
    vi.stubEnv('IP_HASH_SECRET', 'test-secret');
    expect(isIpHashSecretConfigured()).toBe(true);
    vi.stubEnv('IP_HASH_SECRET', '');
    expect(isIpHashSecretConfigured()).toBe(false);
  });
});

describe('hashIp', () => {
  it('returns a stable 32-char hex identifier per IP when a secret is set', () => {
    vi.stubEnv('IP_HASH_SECRET', 'test-secret');
    vi.stubEnv('NODE_ENV', 'test');
    const a = hashIp('203.0.113.7');
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(hashIp('203.0.113.7')).toBe(a);
    expect(hashIp('203.0.113.8')).not.toBe(a);
  });

  it('throws in production when the secret is missing (fail-closed)', () => {
    vi.stubEnv('IP_HASH_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => hashIp('203.0.113.7')).toThrow(/IP_HASH_SECRET is missing in production/);
  });

  it('falls back to an insecure dev hash outside production (never throws)', () => {
    vi.stubEnv('IP_HASH_SECRET', '');
    vi.stubEnv('NODE_ENV', 'test');
    expect(hashIp('203.0.113.7')).toMatch(/^[0-9a-f]{32}$/);
  });
});
