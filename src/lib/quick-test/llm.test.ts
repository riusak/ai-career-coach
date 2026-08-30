import { describe, expect, it } from 'vitest';
import {
  buildAnalysisPrompt,
  coerceLlmAnalysis,
  extractGeminiText,
} from '@/lib/quick-test/llm';

describe('buildAnalysisPrompt', () => {
  it('embeds the CV text and the JSON structure instructions', () => {
    const prompt = buildAnalysisPrompt('Jean Dupont, développeur.');
    expect(prompt).toContain('Jean Dupont, développeur.');
    expect(prompt).toContain('"score"');
    expect(prompt).toContain('JSON');
  });

  it('truncates very long CV texts', () => {
    const prompt = buildAnalysisPrompt('x'.repeat(20_000));
    expect(prompt).toContain('[Texte tronqué]');
    expect(prompt.length).toBeLessThan(16_000);
  });
});

describe('coerceLlmAnalysis', () => {
  const validPayload = {
    score: 78.4,
    strengths: ['Bon impact chiffré', 'Structure claire'],
    weaknesses: ['Trop long'],
    recommendations: ['Condensez sur une page'],
  };

  it('accepts a valid payload and clamps/rounds the score', () => {
    const analysis = coerceLlmAnalysis(validPayload);
    expect(analysis).not.toBeNull();
    expect(analysis!.score).toBe(78);
    expect(analysis!.strengths).toHaveLength(2);
  });

  it('clamps out-of-range scores', () => {
    expect(coerceLlmAnalysis({ ...validPayload, score: 250 })!.score).toBe(100);
    expect(coerceLlmAnalysis({ ...validPayload, score: -5 })!.score).toBe(0);
  });

  it('accepts numeric scores as strings', () => {
    expect(coerceLlmAnalysis({ ...validPayload, score: '64' })!.score).toBe(64);
  });

  it('truncates lists to the display limits (3/3/2)', () => {
    const analysis = coerceLlmAnalysis({
      ...validPayload,
      strengths: ['a', 'b', 'c', 'd', 'e'],
      recommendations: ['r1', 'r2', 'r3'],
    });
    expect(analysis!.strengths).toHaveLength(3);
    expect(analysis!.recommendations).toHaveLength(2);
  });

  it('drops empty/non-string list entries', () => {
    const analysis = coerceLlmAnalysis({
      ...validPayload,
      strengths: ['ok', '   ', 42, null],
    });
    expect(analysis!.strengths).toEqual(['ok']);
  });

  it('returns null for malformed payloads', () => {
    expect(coerceLlmAnalysis(null)).toBeNull();
    expect(coerceLlmAnalysis('garbage')).toBeNull();
    expect(coerceLlmAnalysis({})).toBeNull();
    expect(coerceLlmAnalysis({ ...validPayload, score: 'abc' })).toBeNull();
    expect(coerceLlmAnalysis({ ...validPayload, strengths: [] })).toBeNull();
    expect(
      coerceLlmAnalysis({ ...validPayload, recommendations: [] })
    ).toBeNull();
  });
});

describe('extractGeminiText', () => {
  it('joins the text parts of the first candidate', () => {
    const body = {
      candidates: [
        {
          content: {
            parts: [{ text: '{"score": 80}' }, { text: ' suffix' }],
          },
        },
      ],
    };
    expect(extractGeminiText(body)).toBe('{"score": 80} suffix');
  });

  it('returns null for unexpected response shapes', () => {
    expect(extractGeminiText(null)).toBeNull();
    expect(extractGeminiText({})).toBeNull();
    expect(extractGeminiText({ candidates: [] })).toBeNull();
    expect(extractGeminiText({ candidates: [{ content: {} }] })).toBeNull();
  });
});