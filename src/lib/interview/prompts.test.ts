import { describe, expect, it } from 'vitest';
import {
  buildRecruiterSystemPrompt,
  buildStarEvaluationPrompt,
  extractCleanSpeech,
  type InterviewContext,
} from '@/lib/interview/prompts';
import type { InterviewTurn } from '@/types/interview';

describe('Interview Prompts Builder', () => {
  const techContextFr: InterviewContext = {
    jobTitle: 'Senior Fullstack Engineer',
    company: 'Fintech Corp',
    language: 'fr',
    interviewType: 'technical',
  };

  const salesContextEn: InterviewContext = {
    jobTitle: 'Account Executive',
    company: 'SaaS Scaleup',
    language: 'en',
    interviewType: 'sales',
  };

  it('generates technical profile guidance and the panel stages in French', () => {
    const prompt = buildRecruiterSystemPrompt(techContextFr);
    expect(prompt).toContain('PROFIL TECHNIQUE / IT');
    expect(prompt).toContain('Mme Alisor');
    expect(prompt).toContain('Marc Laurent');
    expect(prompt).toContain('Étape 1 (Mme Alisor) - Le Pitch d\'introduction');
    expect(prompt).toContain('Étape 3 (Marc Laurent) - Le Deep-dive Métier');
    expect(prompt).toContain('Étape 5 (Mme Alisor) - La Conviction & Closing');
    expect(prompt).toContain('Fintech Corp');
  });

  it('generates sales guidance and the panel stages in English', () => {
    const prompt = buildRecruiterSystemPrompt(salesContextEn);
    expect(prompt).toContain('SALES / BUSINESS PROFILE');
    expect(prompt).toContain('Mrs. Alisor');
    expect(prompt).toContain('Mark Laurent');
    expect(prompt).toContain('5 MANDATORY STAGES');
    expect(prompt).toContain('SaaS Scaleup');
  });

  it('generates a STAR evaluation prompt containing all transcript lines', () => {
    const sampleTurns: InterviewTurn[] = [
      {
        id: '1',
        role: 'recruiter',
        content: 'Présentez-vous en deux minutes.',
        emotion: 'smiling',
        stage: 1,
        timestamp: '2026-09-06T12:00:00Z',
      },
      {
        id: '2',
        role: 'candidate',
        content: 'Je suis ingénieur backend avec 5 ans d’expérience sur Node et Postgres.',
        stage: 1,
        timestamp: '2026-09-06T12:01:00Z',
      },
    ];

    const evalPrompt = buildStarEvaluationPrompt(techContextFr, sampleTurns);
    expect(evalPrompt).toContain('MÉTHODE D\'ÉVALUATION S.T.A.R.');
    expect(evalPrompt).toContain('Senior Fullstack Engineer');
    expect(evalPrompt).toContain('Je suis ingénieur backend avec 5 ans d’expérience');
  });
});

describe('extractCleanSpeech Anti-Leak', () => {
  it('extracts clean text when Gemini wraps response in attached ```json{ codeblock', () => {
    const raw = '```json{\n  "reaction": "Mmh, très bien.",\n  "emotion": "smiling",\n  "next_question": "Pourquoi avez-vous choisi cette technologie ?"\n}```';
    const result = extractCleanSpeech(raw);
    expect(result.text).toBe('Mmh, très bien. Pourquoi avez-vous choisi cette technologie ?');
    expect(result.emotion).toBe('smiling');
  });

  it('strips any residual JSON keys if format is slightly broken', () => {
    const raw = '```json{ "emotion": "smiling", "is_followup": false, "reaction": "Ravi de vous entendre.", "next_question": "Présentez-vous." }';
    const result = extractCleanSpeech(raw);
    expect(result.text).not.toContain('json');
    expect(result.text).not.toContain('{');
    expect(result.text).not.toContain('}');
    expect(result.text).toContain('Ravi de vous entendre.');
    expect(result.text).toContain('Présentez-vous.');
  });

  it('handles standard plain conversational strings untouched', () => {
    const raw = 'Bonjour et bienvenue dans notre entretien ! Pouvez-vous commencer par vous présenter ?';
    const result = extractCleanSpeech(raw);
    expect(result.text).toBe(raw);
  });
});
