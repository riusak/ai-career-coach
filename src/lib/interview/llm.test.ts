import { describe, expect, it } from 'vitest';
import {
  generateInitialGreeting,
  generateNextInterviewTurn,
  generateStarEvaluation,
} from '@/lib/interview/llm';
import type { InterviewTurn } from '@/types/interview';

describe('Interview LLM fallback & mapping', () => {
  const context = {
    jobTitle: 'Lead DevOps Engineer',
    company: 'Cloud Native SARL',
    language: 'fr' as const,
    interviewType: 'technical' as const,
  };

  it('produces a realistic greeting turn in French even when API key is unset', async () => {
    const greeting = await generateInitialGreeting(context);
    expect(greeting.text).toContain('Lead DevOps Engineer');
    expect(greeting.emotion).toBe('smiling');
  });

  it('handles fallback step progression when API key is unset', async () => {
    const transcript: InterviewTurn[] = [
      {
        id: '1',
        role: 'recruiter',
        content: 'Présentez-vous.',
        emotion: 'smiling',
        stage: 1,
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        role: 'candidate',
        content: 'J’ai géré des clusters Kubernetes et des pipelines CI/CD.',
        stage: 1,
        timestamp: new Date().toISOString(),
      },
    ];

    const step = await generateNextInterviewTurn(context, transcript, 1, false);
    expect(step.reaction).toBeTruthy();
    expect(step.nextQuestion).toBeTruthy();
    expect(step.currentStep).toBe(2);
    expect(step.isCompleted).toBe(false);
  });

  it('produces a structured fallback STAR evaluation with all 4 pillars and feedback', async () => {
    const transcript: InterviewTurn[] = [
      {
        id: '1',
        role: 'recruiter',
        content: 'Présentez-vous.',
        stage: 1,
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        role: 'candidate',
        content: 'Mon parcours est centré sur la modernisation d’infrastructures.',
        stage: 1,
        timestamp: new Date().toISOString(),
      },
    ];

    const evaluation = await generateStarEvaluation(context, transcript);
    expect(evaluation).not.toBeNull();
    expect(evaluation?.overallScore).toBeGreaterThanOrEqual(0);
    expect(evaluation?.overallScore).toBeLessThanOrEqual(100);
    expect(evaluation?.situationScore).toBeGreaterThanOrEqual(0);
    expect(evaluation?.taskScore).toBeGreaterThanOrEqual(0);
    expect(evaluation?.actionScore).toBeGreaterThanOrEqual(0);
    expect(evaluation?.resultScore).toBeGreaterThanOrEqual(0);
    expect(evaluation?.strengthsSummary.length).toBeGreaterThan(0);
    expect(evaluation?.weaknessesSummary.length).toBeGreaterThan(0);
    expect(evaluation?.keyAdvice.length).toBeGreaterThan(0);
    expect(evaluation?.questionsFeedback.length).toBeGreaterThan(0);
  });
});
