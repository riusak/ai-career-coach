import { describe, expect, it } from 'vitest';
import {
  buildAnalysisPrompt,
  coerceLlmAnalysis,
  extractCvGate,
  extractGeminiText,
} from '@/lib/quick-test/llm';

const validPayload = {
  score: 78.4,
  score_breakdown: [
    { category: 'Structure & lisibilité', score: 88, comment: 'Sections claires.' },
    { category: 'Impact chiffré', score: 70.9, comment: 'Plusieurs résultats chiffrés.' },
  ],
  strengths: [
    { title: 'Bon impact chiffré', detail: 'Ventes augmentées de 35 %.' },
    { title: 'Structure claire', detail: 'Sections standard présentes.' },
  ],
  weaknesses: [{ title: 'Trop long', detail: 'Plus de 900 mots.' }],
  recommendations: [
    { title: 'Condensez sur une page', detail: 'Supprimez les expériences anciennes.' },
  ],
  formatting_advice: 'Passez sur une page pour accélérer la lecture.',
  action_verbs_advice: 'Ajoutez des verbes d’action en tête de puce.',
  impact_metrics_advice: 'Chiffrez chaque puce (%, montants, volumes).',
};

describe('buildAnalysisPrompt', () => {
  it('embeds the CV text and the deep JSON structure instructions (DOCX/TXT path)', () => {
    const prompt = buildAnalysisPrompt('Jean Dupont, développeur.');
    expect(prompt).toContain('Jean Dupont, développeur.');
    expect(prompt).toContain('"score_breakdown"');
    expect(prompt).toContain('"formatting_advice"');
    expect(prompt).toContain('JSON');
  });

  it('instructs a native-document analysis when no text is provided (PDF path)', () => {
    const prompt = buildAnalysisPrompt(null);
    expect(prompt).toContain('pièce jointe PDF');
    expect(prompt).not.toContain('TEXTE DU DOCUMENT');
  });

  it('demands recruiter-grade depth covering layout AND content dimensions', () => {
    const prompt = buildAnalysisPrompt('CV text');
    // Layout / structural design dimensions (document-native upgrade).
    expect(prompt).toContain('Mise en page & lisibilité');
    expect(prompt).toContain('Hiérarchie visuelle');
    expect(prompt).toContain('sidebars');
    expect(prompt).toContain('parsing ATS');
    // Content dimensions.
    expect(prompt).toContain('Structure');
    expect(prompt).toContain('Mots-clés ATS');
    expect(prompt).toContain('action_verbs_advice');
    expect(prompt).toContain('impact_metrics_advice');
    // At least 6 dimensions required in the breakdown.
    expect(prompt).toContain('AU MOINS 6 dimensions');
  });

  it('truncates very long CV texts', () => {
    const prompt = buildAnalysisPrompt('x'.repeat(20_000));
    expect(prompt).toContain('[tronqué]');
    expect(prompt.length).toBeLessThan(20_000);
  });
});

describe('coerceLlmAnalysis', () => {
  it('accepts a valid deep payload and clamps/rounds the score', () => {
    const analysis = coerceLlmAnalysis(validPayload);
    expect(analysis).not.toBeNull();
    expect(analysis!.score).toBe(78);
    expect(analysis!.scoreBreakdown).toHaveLength(2);
    expect(analysis!.scoreBreakdown[0]!.category).toBe('Structure & lisibilité');
    expect(analysis!.strengths).toHaveLength(2);
    expect(analysis!.strengths[0]!.title).toBe('Bon impact chiffré');
    expect(analysis!.formattingAdvice).toContain('une page');
    expect(analysis!.impactMetricsAdvice).toContain('Chiffrez');
  });

  it('clamps out-of-range scores (global and per-dimension)', () => {
    const analysis = coerceLlmAnalysis({
      ...validPayload,
      score: 250,
      score_breakdown: [{ category: 'X', score: -12, comment: '' }],
    });
    expect(analysis!.score).toBe(100);
    expect(analysis!.scoreBreakdown[0]!.score).toBe(0);
    expect(coerceLlmAnalysis({ ...validPayload, score: -5 })!.score).toBe(0);
  });

  it('accepts numeric scores as strings', () => {
    expect(coerceLlmAnalysis({ ...validPayload, score: '64' })!.score).toBe(64);
  });

  it('truncates lists to the display limits (4 insights, 8 breakdown items, 5 recs)', () => {
    const insight = { title: 't', detail: 'd' };
    const analysis = coerceLlmAnalysis({
      ...validPayload,
      score_breakdown: Array.from({ length: 12 }, (_, i) => ({
        category: `D${i}`,
        score: 50,
        comment: '',
      })),
      strengths: Array.from({ length: 7 }, () => insight),
      weaknesses: Array.from({ length: 7 }, () => insight),
      recommendations: Array.from({ length: 9 }, () => insight),
    });
    expect(analysis!.scoreBreakdown).toHaveLength(8);
    expect(analysis!.strengths).toHaveLength(4);
    expect(analysis!.weaknesses).toHaveLength(4);
    expect(analysis!.recommendations).toHaveLength(5);
  });

  it('tolerates plain-string insights and drops empty/non-string entries', () => {
    const analysis = coerceLlmAnalysis({
      ...validPayload,
      strengths: ['Puce concise', '   ', 42, null, { title: '', detail: 'Détail seul' }],
    });
    expect(analysis!.strengths).toHaveLength(2);
    expect(analysis!.strengths[0]!.title).toBe('Puce concise');
    expect(analysis!.strengths[1]!.detail).toBe('Détail seul');
  });

  it('defaults missing advice fields to empty strings (UI hides them)', () => {
    const analysis = coerceLlmAnalysis({
      ...validPayload,
      formatting_advice: undefined,
      action_verbs_advice: 123,
    });
    expect(analysis!.formattingAdvice).toBe('');
    expect(analysis!.actionVerbsAdvice).toBe('');
    expect(analysis!.impactMetricsAdvice).toContain('Chiffrez');
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
    expect(coerceLlmAnalysis({ ...validPayload, score_breakdown: [] })).toBeNull();
    expect(
      coerceLlmAnalysis({
        ...validPayload,
        score_breakdown: [{ category: '', score: 50, comment: '' }],
      })
    ).toBeNull();
  });
});

describe('extractCvGate', () => {
  it('extracts the merged semantic gate fields', () => {
    const gate = extractCvGate({
      is_cv: false,
      document_type: 'invoice',
      detected_language: 'FR',
    });
    expect(gate).toEqual({ isCv: false, documentType: 'invoice', detectedLanguage: 'fr' });
  });

  it('treats a missing is_cv as true (never blocks a real CV on an absent field)', () => {
    const gate = extractCvGate({ score: 80 });
    expect(gate.isCv).toBe(true);
    expect(gate.documentType).toBe('unknown');
    expect(gate.detectedLanguage).toBe('unknown');
  });

  it('tolerates null/non-object payloads', () => {
    const gate = extractCvGate(null);
    expect(gate.isCv).toBe(true);
    expect(gate.documentType).toBe('unknown');
  });

  it('only accepts a strict boolean true for is_cv', () => {
    expect(extractCvGate({ is_cv: 'true' }).isCv).toBe(false);
    expect(extractCvGate({ is_cv: 1 }).isCv).toBe(false);
    expect(extractCvGate({ is_cv: true }).isCv).toBe(true);
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