import { describe, expect, it } from 'vitest';
import { classifyAuthError } from '@/lib/supabase/auth-errors';

describe('classifyAuthError', () => {
  it('classifies SMTP delivery failures (Error sending confirmation email)', () => {
    const info = classifyAuthError('Error sending confirmation email');
    expect(info.kind).toBe('confirmation-email');
    expect(info.message).toContain('SMTP');
  });

  it('classifies recovery email failures the same way', () => {
    expect(classifyAuthError('Error sending recovery email').kind).toBe(
      'confirmation-email'
    );
    expect(classifyAuthError('Error sending password recovery email').kind).toBe(
      'confirmation-email'
    );
  });

  it('classifies "User already registered"', () => {
    const info = classifyAuthError('User already registered');
    expect(info.kind).toBe('user-already-registered');
    expect(info.message.toLowerCase()).toContain('sign in');
  });

  it('classifies GoTrue frequency-limit messages', () => {
    expect(
      classifyAuthError(
        'For security purposes, you can only request this after 60 seconds.'
      ).kind
    ).toBe('rate-limited');
  });

  it('classifies other rate limit variants', () => {
    expect(classifyAuthError('Rate limit exceeded')).toBeDefined();
    expect(classifyAuthError('Daily quota exceeded').kind).toBe('rate-limited');
  });

  it('falls back to the raw message for unknown errors', () => {
    const raw = 'Unable to validate email address: invalid format';
    const info = classifyAuthError(raw);
    expect(info.kind).toBe('generic');
    expect(info.message).toBe(raw);
  });
});