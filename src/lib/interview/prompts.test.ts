import { describe, expect, it } from 'vitest';
import {
  buildRecruiterSystemPrompt,
  buildStarEvaluationPrompt,
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

  it('generates technical profile guidance and the 5 mandatory stages in French', () => {
    const prompt = buildRecruiterSystemPrompt(techContextFr);
    expect(prompt).toContain('PROFIL TECHNIQUE / IT');
    expect(prompt).toContain('Étape 1 - Le Pitch d\'introduction');
    expect(prompt).toContain('Étape 4 - L\'épreuve comportementale STAR');
    expect(prompt).toContain('Étape 5 - La Conviction & Closing');
    expect(prompt).toContain('DÉTECTION DU FLOU ET DÉCLENCHEMENT DE RELANCE');
    expect(prompt).toContain('Fintech Corp');
  });

  it('generates sales guidance and the 5 mandatory stages in English', () => {
    const prompt = buildRecruiterSystemPrompt(salesContextEn);
    expect(prompt).toContain('SALES / BUSINESS PROFILE');
    expect(prompt).toContain('5 MANDATORY INTERVIEW STAGES');
    expect(prompt).toContain('FLUFF DETECTION & IMMEDIATE FOLLOW-UPS');
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
