import { describe, expect, it } from 'vitest';
import { isAdminRole, resolvePostLoginPath } from '@/lib/auth/post-login';

describe('isAdminRole', () => {
  it('returns true only for the explicit admin role', () => {
    expect(isAdminRole('admin')).toBe(true);
  });

  it('returns false for regular users and any other value', () => {
    expect(isAdminRole('user')).toBe(false);
    expect(isAdminRole('ADMIN')).toBe(false);
    expect(isAdminRole('moderator')).toBe(false);
    expect(isAdminRole('')).toBe(false);
  });

  it('returns false for missing roles (null/undefined)', () => {
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

describe('resolvePostLoginPath', () => {
  it('sends admins straight to the admin console', () => {
    expect(resolvePostLoginPath('admin')).toBe('/admin');
  });

  it('sends regular users to the standard dashboard', () => {
    expect(resolvePostLoginPath('user')).toBe('/dashboard');
  });

  it('falls back to the standard dashboard when the role is unknown', () => {
    expect(resolvePostLoginPath(null)).toBe('/dashboard');
    expect(resolvePostLoginPath(undefined)).toBe('/dashboard');
    expect(resolvePostLoginPath('unexpected-value')).toBe('/dashboard');
  });
});
