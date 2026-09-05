import { describe, expect, it } from 'vitest';
import { coerceLlmMatchingResult, buildMatchingPrompt } from '@/lib/quick-test/matching-llm';

const validPayload = {
  overall_score: 82,
  skills_score: 85,
  experience_score: 90,
  keywords_score: 70,
  summary: 'Bonne adéquation globale.',
  strengths: [{ title: 'Kafka', detail: 'Flux à fort volume' }],
  gaps: [{ title: 'PCI-DSS', detail: 'Absent du CV' }],
  matched_keywords: ['Kafka', 'Kubernetes'],
  missing_keywords: ['PCI-DSS', 'FinOps'],
  recommendations: [{ title: 'Ajouter PCI-DSS', detail: 'Dans le résumé' }],
  company: 'Wave',
  location: 'Dakar',
};

describe('coerceLlmMatchingResult', () => {
  it('coerces a valid payload', () => {
    const result = coerceLlmMatchingResult(validPayload);
    expect(result).not.toBeNull();
    expect(result?.overallScore).toBe(82);
    expect(result?.skillsScore).toBe(85);
    expect(result?.missingKeywords).toEqual(['PCI-DSS', 'FinOps']);
    expect(result?.company).toBe('Wave');
  });

  it('rejects null / non-object payloads', () => {
    expect(coerceLlmMatchingResult(null)).toBeNull();
    expect(coerceLlmMatchingResult('json')).toBeNull();
    expect(coerceLlmMatchingResult(undefined)).toBeNull();
  });

  it('rejects payloads without the overall score', () => {
    const rest = { ...validPayload } as Record<string, unknown>;
    delete rest.overall_score;
    expect(coerceLlmMatchingResult(rest)).toBeNull();
  });

  it('rejects payloads with empty required item lists', () => {
    expect(
      coerceLlmMatchingResult({ ...validPayload, strengths: [], gaps: [], recommendations: [] })
    ).toBeNull();
    expect(
      coerceLlmMatchingResult({ ...validPayload, missing_keywords: [] })
    ).not.toBeNull();
  });

  it('clamps scores and stringifies numeric scores', () => {
    const result = coerceLlmMatchingResult({
      ...validPayload,
      overall_score: '118',
      skills_score: -10,
      experience_score: 42.6,
    });
    expect(result?.overallScore).toBe(100);
    expect(result?.skillsScore).toBe(0);
    expect(result?.experienceScore).toBe(43);
  });

  it('caps list sizes', () => {
    const payload = {
      ...validPayload,
      strengths: Array.from({ length: 20 }, (_, i) => ({ title: `S${i}`, detail: '' })),
      matched_keywords: Array.from({ length: 20 }, (_, i) => `k${i}`),
    };
    const result = coerceLlmMatchingResult(payload);
    expect(result?.strengths.length).toBeLessThanOrEqual(6);
    expect(result?.matchedKeywords.length).toBeLessThanOrEqual(12);
  });
});

describe('buildMatchingPrompt', () => {
  it('embeds the job title, offer and resume text', () => {
    const prompt = buildMatchingPrompt({
      resumeText: 'Jean Dupont',
      jobTitle: 'Lead Architect',
      jobDescription: 'Offre complète…',
    });
    expect(prompt).toContain('Lead Architect');
    expect(prompt).toContain('Jean Dupont');
    expect(prompt).toContain('Offre complète…');
  });

  it('truncates oversized resume text', () => {
    const prompt = buildMatchingPrompt({
      resumeText: 'x'.repeat(50_000),
      jobTitle: 'Poste',
      jobDescription: 'Offre courte.',
    });
    expect(prompt.length).toBeLessThan(30_000);
  });
});