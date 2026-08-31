import { describe, expect, it } from 'vitest';
import {
  buildUsersQuery,
  clampPage,
  computePercent,
  formatPercent,
  parsePositiveInt,
  parseRoleFilter,
  toUserRole,
  truncateMiddle,
} from '@/lib/admin/utils';

describe('parsePositiveInt', () => {
  it('returns the fallback for empty/absent values', () => {
    expect(parsePositiveInt(undefined, 5)).toBe(5);
    expect(parsePositiveInt('', 5)).toBe(5);
  });

  it('returns the fallback for invalid input', () => {
    expect(parsePositiveInt('abc', 5)).toBe(5);
    expect(parsePositiveInt('-3', 5)).toBe(5);
    expect(parsePositiveInt('0', 5)).toBe(5);
  });

  it('parses and clamps valid input', () => {
    expect(parsePositiveInt('2', 1)).toBe(2);
    expect(parsePositiveInt('999999', 1, 100)).toBe(100);
  });
});

describe('parseRoleFilter', () => {
  it('accepts only the two authorized roles', () => {
    expect(parseRoleFilter('admin')).toBe('admin');
    expect(parseRoleFilter('user')).toBe('user');
    expect(parseRoleFilter(undefined)).toBeNull();
    expect(parseRoleFilter('root')).toBeNull();
    expect(parseRoleFilter('')).toBeNull();
  });
});

describe('toUserRole', () => {
  it('validates role strings against the whitelist', () => {
    expect(toUserRole('admin')).toBe('admin');
    expect(toUserRole('user')).toBe('user');
    expect(toUserRole('root')).toBeNull();
    expect(toUserRole(null)).toBeNull();
  });
});

describe('clampPage', () => {
  it('clamps into the valid range', () => {
    expect(clampPage(1, 10)).toBe(1);
    expect(clampPage(10, 10)).toBe(10);
    expect(clampPage(15, 10)).toBe(10);
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(3, 0)).toBe(1);
  });
});

describe('computePercent / formatPercent', () => {
  it('returns null (and a placeholder) when the denominator is empty', () => {
    expect(computePercent(5, 0)).toBeNull();
    expect(computePercent(5, -1)).toBeNull();
    expect(formatPercent(null)).toBe('—');
  });

  it('rounds to one decimal', () => {
    expect(computePercent(1, 3)).toBe(33.3);
    expect(computePercent(50, 100)).toBe(50);
  });

  it('formats a numeric percent', () => {
    expect(formatPercent(33.3)).toBe('33.3%');
  });
});

describe('truncateMiddle', () => {
  it('keeps short text untouched', () => {
    expect(truncateMiddle('abc', 14)).toBe('abc');
  });

  it('truncates long text and keeps both ends', () => {
    const result = truncateMiddle('0123456789abcdef', 14);
    expect(result.length).toBeLessThanOrEqual(14);
    expect(result).toContain('…');
    expect(result.startsWith('0')).toBe(true);
    expect(result.endsWith('f')).toBe(true);
  });
});

describe('buildUsersQuery', () => {
  it('skips empty filters', () => {
    expect(buildUsersQuery(null, null)).toBe('');
    expect(buildUsersQuery('   ', null)).toBe('');
  });

  it('includes present filters', () => {
    expect(buildUsersQuery('  dev  ', 'admin')).toBe('q=dev&role=admin');
  });
});