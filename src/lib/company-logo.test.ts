// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  companyDomain,
  companyInitials,
  fallbackColorFor,
  getCompanyLogoSource,
  getCompanyLogoUrl,
} from '@/lib/company-logo';

describe('companyDomain', () => {
  it('returns null for empty / unusable names', () => {
    expect(companyDomain('')).toBeNull();
    expect(companyDomain('   ')).toBeNull();
    expect(companyDomain('123')).toBeNull();
  });

  it('wins on the exact overrides map', () => {
    expect(companyDomain('Datadog EMEA')).toBe('datadoghq.com');
    expect(companyDomain('Paystack (Stripe Africa)')).toBe('paystack.com');
    expect(companyDomain('Orange Middle East & Africa')).toBe('orange.com');
    expect(companyDomain('Moov Africa')).toBe('moov-africa.com');
  });

  it('uses the first significant word + .com otherwise', () => {
    expect(companyDomain('DevLab Studio')).toBe('devlab.com');
    expect(companyDomain('TogoTech Solutions')).toBe('togotech.com');
    expect(companyDomain('Upwork Global')).toBe('upwork.com');
    expect(companyDomain('Wave Mobile Money')).toBe('wave.com');
    expect(companyDomain('Ecobank Transnational')).toBe('ecobank.com');
  });

  it('does not crash on mixed-case or accented input', () => {
    expect(companyDomain('  Acmé Digital ')).toBe('acme.com');
  });
});

describe('getCompanyLogoUrl', () => {
  it('builds the Clearbit URL from the derived domain', () => {
    expect(getCompanyLogoUrl('Datadog EMEA')).toBe('https://logo.clearbit.com/datadoghq.com');
    expect(getCompanyLogoUrl('Acme')).toBe('https://logo.clearbit.com/acme.com');
  });

  it('returns null when no domain can be derived', () => {
    expect(getCompanyLogoUrl('')).toBeNull();
  });
});

describe('companyInitials', () => {
  it('uses the first letters of the two significant words', () => {
    expect(companyInitials('Wave Mobile Money')).toBe('WM');
    expect(companyInitials('DevLab Studio')).toBe('DS');
    expect(companyInitials('GVA Group')).toBe('GVA');
  });

  it('falls back to the first three letters of a single word', () => {
    expect(companyInitials('Upwork')).toBe('UPW');
    expect(companyInitials('Moov')).toBe('MOO');
  });

  it('returns empty for an empty name', () => {
    expect(companyInitials('')).toBe('');
  });
});

describe('fallbackColorFor', () => {
  it('is deterministic for the same company', () => {
    expect(fallbackColorFor('Wave Mobile Money')).toBe(fallbackColorFor('Wave Mobile Money'));
  });

  it('differs across distinct companies at least occasionally', () => {
    const colors = new Set(
      ['Wave Mobile Money', 'DevLab Studio', 'TogoTech Solutions', 'GVA Group', 'Moov Africa'].map(
        fallbackColorFor
      )
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('getCompanyLogoSource', () => {
  it('bundles url, initials and color for the component', () => {
    const source = getCompanyLogoSource('Wave Mobile Money');
    expect(source.url).toBe('https://logo.clearbit.com/wave.com');
    expect(source.initials).toBe('WM');
    expect(source.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('keeps the fallback data available even without a domain', () => {
    const source = getCompanyLogoSource('123');
    expect(source.url).toBeNull();
    expect(source.initials).toBeTruthy();
  });
});
