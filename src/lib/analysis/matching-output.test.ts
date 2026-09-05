import { describe, expect, it } from 'vitest';
import { parseJobMatchingDetails } from '@/lib/analysis/matching-output';

const completedDetails = {
  source: 'llm',
  result: {
    overall: 82,
    subscores: { skills: 85, experience: 90, keywords: 70 },
    summary: 'Bonne adéquation globale.',
    strengths: [{ title: 'Kafka', detail: 'Flux à fort volume' }],
    gaps: [{ title: 'PCI-DSS', detail: 'Absent' }],
    matchedKeywords: ['Kafka', 'Kubernetes'],
    missingKeywords: ['PCI-DSS', 'FinOps'],
    recommendations: [{ title: 'Ajouter PCI-DSS', detail: 'Dans le résumé' }],
    company: 'Wave',
    location: 'Dakar',
  },
};

describe('parseJobMatchingDetails', () => {
  it('returns null for non-object payloads', () => {
    expect(parseJobMatchingDetails(null)).toBeNull();
    expect(parseJobMatchingDetails('string')).toBeNull();
    expect(parseJobMatchingDetails(42)).toBeNull();
    expect(parseJobMatchingDetails(undefined)).toBeNull();
  });

  it('returns null for the transient processing marker', () => {
    expect(
      parseJobMatchingDetails({ source: 'llm', status: 'processing', claimed_at: '2026-01-01' })
    ).toBeNull();
  });

  it('returns null when the result payload is broken', () => {
    expect(parseJobMatchingDetails({ source: 'llm', result: { nope: true } })).toBeNull();
    expect(parseJobMatchingDetails({ source: 'llm', result: null })).toBeNull();
  });

  it('parses a completed details payload', () => {
    const parsed = parseJobMatchingDetails(completedDetails);
    expect(parsed).not.toBeNull();
    expect(parsed?.result?.overall).toBe(82);
    expect(parsed?.result?.subscores).toEqual({ skills: 85, experience: 90, keywords: 70 });
    expect(parsed?.result?.strengths[0].title).toBe('Kafka');
    expect(parsed?.result?.missingKeywords).toEqual(['PCI-DSS', 'FinOps']);
    expect(parsed?.result?.company).toBe('Wave');
  });

  it('clamps out-of-range numeric scores and filters malformed lists', () => {
    const raw = {
      source: 'llm',
      result: {
        overall: 150,
        subscores: { skills: -5, experience: 120, keywords: 'n/a' },
        summary: '…',
        strengths: [{ title: 'Ok', detail: '' }],
        gaps: [],
        matchedKeywords: ['A', 42, 'B'],
        missingKeywords: [],
        recommendations: [{ title: 'Agir', detail: 'Maintenant' }],
        company: 12,
        location: null,
      },
    };
    const parsed = parseJobMatchingDetails(raw);
    expect(parsed?.result?.overall).toBe(100);
    expect(parsed?.result?.subscores.skills).toBe(0);
    expect(parsed?.result?.subscores.experience).toBe(100);
    expect(parsed?.result?.subscores.keywords).toBe(0);
    expect(parsed?.result?.matchedKeywords).toEqual(['A', 'B']);
    expect(parsed?.result?.gaps).toEqual([]);
    expect(parsed?.result?.company).toBeNull();
  });
});