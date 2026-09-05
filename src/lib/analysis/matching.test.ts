import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/quick-test/matching-llm', () => ({
  isLlmConfigured: vi.fn(() => true),
  matchJobOfferWithGemini: vi.fn(),
}));

import {
  analyzeJobMatch,
  MAX_MATCHING_OFFER_CHARS,
} from '@/lib/analysis/matching';
import { isLlmConfigured, matchJobOfferWithGemini } from '@/lib/quick-test/matching-llm';
import type { JobMatchLlmResult } from '@/lib/quick-test/matching-llm';

const isLlmConfiguredMock = isLlmConfigured as Mock;
const matchJobOfferWithGeminiMock = matchJobOfferWithGemini as Mock;

const llmResult: JobMatchLlmResult = {
  overallScore: 82,
  skillsScore: 85,
  experienceScore: 90,
  keywordsScore: 70,
  summary: 'Bonne adéquation globale.',
  strengths: [{ title: 'Kafka', detail: '5 ans sur des flux à fort volume' }],
  gaps: [{ title: 'PCI-DSS', detail: 'Non mentionné dans le CV' }],
  matchedKeywords: ['Kafka', 'Kubernetes'],
  missingKeywords: ['PCI-DSS', 'FinOps'],
  recommendations: [{ title: 'Ajouter PCI-DSS', detail: 'Dans le résumé' }],
  company: 'Wave',
  location: 'Dakar',
};

const validInput = {
  resumeText: 'Jean Dupont — Lead Architect, Kafka, Kubernetes…',
  jobTitle: 'Principal Platform Architect',
  jobDescription:
    "Nous recherchons un architecte plateforme. Missions : concevoir des systèmes distribués, superviser Kubernetes et piloter la fiabilité des flux Kafka. Profil : 10 ans d'expérience, AWS, Terraform.",
};

beforeEach(() => {
  vi.clearAllMocks();
  isLlmConfiguredMock.mockReturnValue(true);
  matchJobOfferWithGeminiMock.mockResolvedValue({ result: llmResult, reason: null });
});

describe('analyzeJobMatch — validation', () => {
  it('rejects an empty resume text', async () => {
    const result = await analyzeJobMatch({ ...validInput, resumeText: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('resume_text_missing');
      expect(result.error.httpStatus).toBe(422);
    }
  });

  it('rejects a missing job title', async () => {
    const result = await analyzeJobMatch({ ...validInput, jobTitle: '  ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('job_title_missing');
      expect(result.error.httpStatus).toBe(422);
    }
  });

  it('rejects an empty job description', async () => {
    const result = await analyzeJobMatch({ ...validInput, jobDescription: '  ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('matching_empty');
      expect(result.error.httpStatus).toBe(400);
    }
  });

  it('rejects a too-short job description', async () => {
    const result = await analyzeJobMatch({ ...validInput, jobDescription: 'Offre courte.' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('matching_too_short');
      expect(result.error.httpStatus).toBe(422);
    }
  });

  it('rejects an oversized job description', async () => {
    const result = await analyzeJobMatch({
      ...validInput,
      jobDescription: 'x'.repeat(MAX_MATCHING_OFFER_CHARS + 1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('matching_too_large');
      expect(result.error.httpStatus).toBe(413);
    }
  });

  it('fails explicitly when the LLM is not configured (no heuristic fallback)', async () => {
    isLlmConfiguredMock.mockReturnValue(false);
    const result = await analyzeJobMatch(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('llm_unavailable');
      expect(result.error.httpStatus).toBe(503);
    }
    expect(matchJobOfferWithGeminiMock).not.toHaveBeenCalled();
  });

  it('fails explicitly when the LLM call fails (no fake score)', async () => {
    matchJobOfferWithGeminiMock.mockResolvedValue({ result: null, reason: 'timeout' });
    const result = await analyzeJobMatch(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('llm_failed');
      expect(result.error.httpStatus).toBe(502);
    }
  });
});

describe('analyzeJobMatch — success mapping', () => {
  it('maps the LLM result into a clamped JobMatchResult', async () => {
    const result = await analyzeJobMatch(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.source).toBe('llm');
    expect(result.result.overall).toBe(82);
    expect(result.result.subscores).toEqual({ skills: 85, experience: 90, keywords: 70 });
    expect(result.result.matchedKeywords).toEqual(['Kafka', 'Kubernetes']);
    expect(result.result.missingKeywords).toEqual(['PCI-DSS', 'FinOps']);
    expect(result.result.company).toBe('Wave');
    expect(result.result.location).toBe('Dakar');
  });

  it('prefers user-provided metadata over the LLM detection', async () => {
    const result = await analyzeJobMatch({
      ...validInput,
      company: 'Paystack',
      location: 'Lagos',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.result.company).toBe('Paystack');
    expect(result.result.location).toBe('Lagos');
  });

  it('reports the real pipeline stages through onStage', async () => {
    const stages: string[] = [];
    await analyzeJobMatch({ ...validInput, onStage: (stage) => stages.push(stage) });
    expect(stages).toEqual(['comparing', 'reporting']);
  });
});