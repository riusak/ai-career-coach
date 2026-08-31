/**
 * Auth/email error mapping for actionable UX.
 *
 * GoTrue (Supabase Auth) surfaces a handful of distinct failure modes whose
 * raw messages are cryptic for end users — especially SMTP delivery failures
 * (e.g. a revoked Brevo SMTP key) which all come back as
 * « Error sending confirmation email » even though the account row was already
 * created. This helper classifies the raw error and returns a human-readable
 * message so the UI can offer the right next step.
 */

export type AuthErrorClassification =
  | 'confirmation-email'
  | 'user-already-registered'
  | 'rate-limited'
  | 'generic';

export interface AuthErrorInfo {
  kind: AuthErrorClassification;
  message: string;
}

const CONFIRMATION_EMAIL_HINT =
  'The confirmation email could not be sent, so no code reached your inbox. ' +
  'The account may already exist. Fix the email/SMTP configuration on the ' +
  'Supabase dashboard (Authentication → SMTP Settings — e.g. a revoked SMTP ' +
  'key), then request a new code from the verification page.';

const USER_ALREADY_REGISTERED_HINT =
  'An account with this email already exists. Sign in directly, or request a ' +
  'new verification code from the verification page.';

const RATE_LIMITED_HINT =
  'Too many emails were requested for this account recently. Please wait a few ' +
  'minutes and try again.';

/**
 * Classifies a raw Supabase Auth error message into a kind + friendly message.
 * Falls back to the original message for anything unrecognized.
 */
export function classifyAuthError(message: string): AuthErrorInfo {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('error sending confirmation email') ||
    normalized.includes('error sending recovery email') ||
    normalized.includes("isn't able to send") ||
    normalized.includes('unable to send') ||
    normalized.includes('email cannot be sent') ||
    normalized.includes('error sending password recovery email') ||
    normalized.includes('error sending invite email')
  ) {
    return { kind: 'confirmation-email', message: CONFIRMATION_EMAIL_HINT };
  }

  if (normalized.includes('user already registered')) {
    return { kind: 'user-already-registered', message: USER_ALREADY_REGISTERED_HINT };
  }

  if (
    normalized.includes('for security purposes, you can only request this after') ||
    normalized.includes('rate limit') ||
    normalized.includes('rate_limit') ||
    normalized.includes('hourly limit') ||
    normalized.includes('daily quota') ||
    normalized.includes('too many requests')
  ) {
    return { kind: 'rate-limited', message: RATE_LIMITED_HINT };
  }

  return { kind: 'generic', message };
}