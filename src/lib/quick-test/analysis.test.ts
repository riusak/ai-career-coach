import { describe, expect, it } from 'vitest';
import { analyzeResumeText } from '@/lib/quick-test/analysis';

const GOOD_CV = `
Jean Dupont
jean.dupont@email.fr · +33 6 12 34 56 78 · linkedin.com/in/jeandupont

Expérience
- Développé une plateforme e-commerce ayant augmenté les ventes de 35 %.
- Piloté une équipe de 6 personnes et réduit les délais de livraison de 20 %.
- Conçu et optimisé l'architecture cloud, amélioré les coûts de 15 %.

Formation
Master Informatique — Université de Paris, 2019.

Compétences
TypeScript, React, Node.js, AWS, Docker.

Langues
Français (natif), Anglais (courant).
`;

describe('analyzeResumeText', () => {
  it('returns null when the text is too short to analyze', () => {
    expect(analyzeResumeText('Jean Dupont, développeur.')).toBeNull();
  });

  it('returns a score within bounds and populated rich findings for a solid CV', () => {
    const analysis = analyzeResumeText(GOOD_CV);
    expect(analysis).not.toBeNull();
    expect(analysis!.score).toBeGreaterThanOrEqual(0);
    expect(analysis!.score).toBeLessThanOrEqual(100);
    expect(analysis!.strengths.length).toBeGreaterThan(0);
    expect(analysis!.strengths.length).toBeLessThanOrEqual(3);
    for (const strength of analysis!.strengths) {
      expect(strength.title.length).toBeGreaterThan(0);
      expect(typeof strength.detail).toBe('string');
    }
  });

  it('produces the full deep-analysis shape (breakdown + targeted advice)', () => {
    const analysis = analyzeResumeText(GOOD_CV);
    expect(analysis).not.toBeNull();
    expect(analysis!.scoreBreakdown).toHaveLength(5);
    for (const item of analysis!.scoreBreakdown) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
      expect(item.category.length).toBeGreaterThan(0);
    }
    expect(analysis!.recommendations.length).toBeGreaterThan(0);
    for (const recommendation of analysis!.recommendations) {
      expect(recommendation.title.length).toBeGreaterThan(0);
      expect(recommendation.detail.length).toBeGreaterThan(0);
    }
    expect(analysis!.formattingAdvice.length).toBeGreaterThan(0);
    expect(analysis!.actionVerbsAdvice.length).toBeGreaterThan(0);
    expect(analysis!.impactMetricsAdvice.length).toBeGreaterThan(0);
  });

  it('recognizes quantified achievements even before punctuation (35 %.)', () => {
    const analysis = analyzeResumeText(GOOD_CV);
    expect(analysis).not.toBeNull();
    expect(
      analysis!.weaknesses.some((weakness) =>
        /chiffr/.test(`${weakness.title} ${weakness.detail}`)
      )
    ).toBe(false);
  });

  it('flags missing contact information as a weakness', () => {
    const noContact = analyzeResumeText(
      GOOD_CV.replace('jean.dupont@email.fr · +33 6 12 34 56 78 · ', 'Coordonnées ').replace(
        'linkedin.com/in/jeandupont',
        ''
      )
    );
    expect(noContact).not.toBeNull();
    expect(noContact!.weaknesses.some((weakness) => weakness.title.includes('Coordonnées'))).toBe(
      true
    );
  });

  it('never produces empty weaknesses for imperfect CVs', () => {
    const minimal = `${'Mot '.repeat(60)}\nExpérience · Formation`;
    const analysis = analyzeResumeText(minimal);
    expect(analysis).not.toBeNull();
    expect(analysis!.weaknesses.length).toBeGreaterThan(0);
  });
});