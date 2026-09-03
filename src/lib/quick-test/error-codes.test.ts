import { describe, expect, it } from 'vitest';
import { parseQuickTestError, QUICK_TEST_ERROR_CODES } from '@/lib/quick-test/error-codes';

describe('parseQuickTestError', () => {
  it('parses a structured error payload with all optional fields', () => {
    const parsed = parseQuickTestError({
      error: 'Ce document ne semble pas être un CV.',
      code: 'not_a_cv',
      documentType: 'invoice',
      documentKind: 'pdf',
    });
    expect(parsed).toEqual({
      error: 'Ce document ne semble pas être un CV.',
      code: 'not_a_cv',
      documentType: 'invoice',
      documentKind: 'pdf',
    });
  });

  it('parses a minimal payload (error only) and defaults the code', () => {
    expect(parseQuickTestError({ error: 'Boom' })).toEqual({
      error: 'Boom',
      code: 'server_error',
      documentType: undefined,
      documentKind: undefined,
    });
  });

  it('rejects unknown codes and invalid document kinds defensively', () => {
    const parsed = parseQuickTestError({
      error: 'Boom',
      code: 'hacked',
      documentType: 'invoice',
      documentKind: 'exe',
    });
    expect(parsed?.code).toBe('server_error');
    expect(parsed?.documentType).toBe('invoice');
    expect(parsed?.documentKind).toBeUndefined();
  });

  it('returns null for success payloads / malformed bodies', () => {
    expect(parseQuickTestError(null)).toBeNull();
    expect(parseQuickTestError('garbage')).toBeNull();
    expect(parseQuickTestError({})).toBeNull();
    expect(parseQuickTestError({ error: '' })).toBeNull();
    expect(parseQuickTestError({ score: 80 })).toBeNull();
  });

  it('exposes the full error-code whitelist', () => {
    expect(QUICK_TEST_ERROR_CODES).toContain('not_a_cv');
    expect(QUICK_TEST_ERROR_CODES).toContain('unsupported_format');
    expect(QUICK_TEST_ERROR_CODES).toContain('llm_failed');
    expect(QUICK_TEST_ERROR_CODES).toContain('invalid_txt');
    expect(QUICK_TEST_ERROR_CODES).toHaveLength(12);
  });
});