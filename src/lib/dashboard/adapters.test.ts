// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildActivities,
  buildCvDetails,
  buildCvSummaries,
  buildMilestones,
  computeProfileStrength,
  computeTotalYearsExp,
  deriveIsEmptyState,
  mapSubscores,
} from '@/lib/dashboard/adapters';
import { formatRelativeTime } from '@/lib/dashboard/relative-time';
import type { Profile, ProfileExperience } from '@/types/profile';
import type { Resume, ResumeAnalysis } from '@/types/resume';

function makeExperience(overrides: Partial<ProfileExperience> = {}): ProfileExperience {
  return {
    id: 'exp-1',
    user_id: 'usr-1',
    company: 'Acme',
    role: 'Engineer',
    description: null,
    start_date: '2020-01-15',
    end_date: '2022-01-15',
    is_current: false,
    display_order: 0,
    key_missions: null,
    technologies: null,
    domain: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'usr-1',
    full_name: 'Marius A.',
    headline: null,
    bio: null,
    role: 'user',
    avatar_url: null,
    banner_url: null,
    phone: null,
    location: null,
    linkedin_url: null,
    github_url: null,
    website_url: null,
    preferred_locale: null,
    target_role: null,
    target_year: null,
    target_description: null,
    target_technologies: null,
    target_skills: null,
    onboarding_completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeResume(overrides: Partial<Resume> = {}): Resume {
  return {
    id: 'cv-1',
    user_id: 'usr-1',
    file_path: 'usr-1/cv.pdf',
    file_name: 'CV.pdf',
    label: null,
    is_primary: true,
    parsed_content: null,
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<ResumeAnalysis> = {}): ResumeAnalysis {
  return {
    id: 'an-1',
    resume_id: 'cv-1',
    user_id: 'usr-1',
    analysis_type: 'deep',
    score: 72,
    structured_output: null,
    created_at: '2026-03-02T00:00:00Z',
    ...overrides,
  };
}

describe('computeTotalYearsExp', () => {
  it('sums fixed experience ranges in decimal years', () => {
    const years = computeTotalYearsExp([
      makeExperience({ start_date: '2020-01-01', end_date: '2022-01-01' }),
    ]);
    expect(years).toBeCloseTo(2, 1);
  });

  it('treats a current experience as running until now', () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
    const years = computeTotalYearsExp([
      makeExperience({ start_date: oneYearAgo, end_date: null, is_current: true }),
    ]);
    expect(years).toBeGreaterThan(0.8);
    expect(years).toBeLessThan(1.3);
  });

  it('skips rows with invalid ranges instead of producing negative time', () => {
    const years = computeTotalYearsExp([
      makeExperience({ start_date: null }),
      makeExperience({ start_date: '2022-01-01', end_date: '2020-01-01' }),
    ]);
    expect(years).toBe(0);
  });
});

describe('computeProfileStrength', () => {
  const emptyInput = {
    profile: makeProfile({ full_name: null }),
    experiences: [],
    skills: [],
    educations: [],
    certifications: [],
    resumeCount: 0,
    analysisCount: 0,
  };

  it('returns 0 for a brand-new user', () => {
    expect(computeProfileStrength(emptyInput)).toBe(0);
  });

  it('rewards identity, experience, skills and CV progress', () => {
    const score = computeProfileStrength({
      ...emptyInput,
      profile: makeProfile({ headline: 'Dev', bio: 'Bio', avatar_url: 'x', phone: '+228' }),
      experiences: [makeExperience({ is_current: true })],
      skills: [
        {
          id: 's',
          user_id: 'u',
          skill_name: 'TS',
          level: 'advanced',
          category: null,
          display_order: 0,
          created_at: '',
          updated_at: '',
        },
      ],
      resumeCount: 1,
      analysisCount: 1,
    });
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('never exceeds 100', () => {
    const score = computeProfileStrength({
      ...emptyInput,
      experiences: Array.from({ length: 10 }, (_, i) =>
        makeExperience({ id: `e${i}`, is_current: true })
      ),
      skills: Array.from({ length: 20 }, (_, i) => ({
        id: `s${i}`,
        user_id: 'u',
        skill_name: `S${i}`,
        level: 'expert' as const,
        category: null,
        display_order: 0,
        created_at: '',
        updated_at: '',
      })),
      resumeCount: 5,
      analysisCount: 5,
    });
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('mapSubscores', () => {
  it('maps matching breakdown dimensions onto the three fixed cards', () => {
    const subscores = mapSubscores(
      [
        { category: 'Impact chiffré', score: 88, comment: '' },
        { category: 'Mots-clés du poste', score: 64, comment: '' },
        { category: 'Structure & lisibilité', score: 91, comment: '' },
      ],
      50
    );
    expect(subscores).toEqual({ impact: 88, keywords: 64, grammar: 91 });
  });

  it('falls back to the global score for missing dimensions', () => {
    const subscores = mapSubscores(
      [{ category: 'Impact chiffré', score: 80, comment: '' }],
      55
    );
    expect(subscores.impact).toBe(80);
    expect(subscores.keywords).toBe(55);
    expect(subscores.grammar).toBe(55);
  });

  it('clamps out-of-range scores', () => {
    const subscores = mapSubscores(
      [
        { category: 'Impact', score: 250, comment: '' },
        { category: 'Mots-clés', score: -5, comment: '' },
        { category: 'Structure', score: Number.NaN, comment: '' },
      ],
      0
    );
    expect(subscores).toEqual({ impact: 100, keywords: 0, grammar: 0 });
  });
});

describe('buildCvSummaries', () => {
  it('maps card metadata without carrying raw text', () => {
    const analysis = makeAnalysis({ score: 66 });
    const summaries = buildCvSummaries(
      [
        makeResume({ id: 'cv-1', is_primary: true, label: 'CV Dev' }),
        makeResume({ id: 'cv-2', is_primary: false, file_name: 'Other.pdf' }),
      ],
      { 'cv-1': analysis }
    );
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toEqual({
      id: 'cv-1',
      name: 'CV.pdf',
      label: 'CV Dev',
      isPrimary: true,
      createdAt: '2026-03-01T00:00:00Z',
      score: 66,
      hasAnalysis: true,
    });
    expect(summaries[1].score).toBeNull();
    expect(summaries[1].hasAnalysis).toBe(false);
    expect(JSON.stringify(summaries)).not.toContain('raw_text');
  });
});

describe('buildCvDetails', () => {
  it('attaches the latest analysis score and mapped subscores', () => {
    const analysis = makeAnalysis({
      structured_output: {
        source: 'llm',
        analysis: {
          score: 72,
          scoreBreakdown: [
            { category: 'Impact chiffré', score: 80, comment: '' },
            { category: 'Structure & lisibilité', score: 90, comment: '' },
          ],
          strengths: [{ title: 'Metrics', detail: 'Strong numbers' }],
          weaknesses: [],
          recommendations: [{ title: 'Add keywords', detail: 'Mirror the offer' }],
          formattingAdvice: '',
          actionVerbsAdvice: '',
          impactMetricsAdvice: '',
        },
      },
    });
    const [cv] = buildCvDetails([makeResume()], { 'cv-1': analysis });
    expect(cv.score).toBe(72);
    expect(cv.subscores).toEqual({ impact: 80, keywords: 72, grammar: 90 });
    expect(cv.summary).toContain('Add keywords');
    expect(cv.strengths).toHaveLength(1);
  });

  it('keeps score null and no subscores for unanalyzed CVs', () => {
    const [cv] = buildCvDetails([makeResume()], {});
    expect(cv.score).toBeNull();
    expect(cv.subscores).toBeNull();
    expect(cv.summary).toBeNull();
  });

  it('ignores rows whose structured_output is a processing marker', () => {
    const analysis = makeAnalysis({ structured_output: { status: 'processing' } });
    const [cv] = buildCvDetails([makeResume()], { 'cv-1': analysis });
    expect(cv.score).toBe(72);
    expect(cv.subscores).toBeNull();
  });

  it('truncates oversized raw text', () => {
    const bigText = 'a'.repeat(25_000);
    const [cv] = buildCvDetails(
      [makeResume({ parsed_content: { raw_text: bigText, word_count: 5000, parsed_at: '' } })],
      null
    );
    expect(cv.rawText).toHaveLength(20_000);
    expect(cv.rawTextTruncated).toBe(true);
  });
});

describe('buildMilestones', () => {
  it('sorts oldest first and coerces the optional jsonb columns', () => {
    const milestones = buildMilestones([
      makeExperience({
        id: 'b',
        start_date: '2021-01-01',
        key_missions: ['Ship'],
        technologies: 'not-an-array' as unknown as string[],
        domain: 'backend',
      }),
      makeExperience({ id: 'a', start_date: '2019-01-01', key_missions: [42, 'Valid'] as unknown as string[] }),
    ]);
    expect(milestones.map((m) => m.id)).toEqual(['a', 'b']);
    expect(milestones[0].keyMissions).toEqual(['Valid']);
    expect(milestones[1].keyMissions).toEqual(['Ship']);
    expect(milestones[1].technologies).toEqual([]);
    expect(milestones[1].domain).toBe('backend');
  });

  it('appends the explicit career goal (migration 012) as the final flag milestone', () => {
    const goalProfile = makeProfile({
      target_role: 'Lead Architect',
      target_year: 2030,
    });

    const withGoal = buildMilestones([makeExperience({ id: 'a' })], goalProfile);
    expect(withGoal).toHaveLength(2);
    const goal = withGoal[1];
    expect(goal.id).toBe('career-goal');
    expect(goal.isGoal).toBe(true);
    expect(goal.role).toBe('Lead Architect');
    expect(goal.year).toBe('2030');
    expect(goal.yearRange).toBe('Objectif 2030');
    expect(goal.isCurrent).toBe(false);

    // No goal set → no synthetic milestone appended.
    const withoutGoal = buildMilestones([makeExperience({ id: 'a' })], makeProfile({}));
    expect(withoutGoal).toHaveLength(1);

    // Null profile → same as before (legacy fallback behaviour intact).
    expect(buildMilestones([makeExperience({ id: 'a' })], null)).toHaveLength(1);
  });

  it('carries the enriched career-objective baseline (migration 014) on the goal', () => {
    const goalProfile = makeProfile({
      target_role: 'Staff Engineer',
      target_year: 2027,
      target_description: 'Own the core payments platform.',
      target_technologies: ['TypeScript', 'AWS', 'Kafka'],
      target_skills: ['System design', 'Leadership'],
    });

    const milestones = buildMilestones([makeExperience({ id: 'a' })], goalProfile);
    const goal = milestones[milestones.length - 1];
    expect(goal.isGoal).toBe(true);
    expect(goal.description).toBe('Own the core payments platform.');
    expect(goal.targetTechnologies).toEqual(['TypeScript', 'AWS', 'Kafka']);
    expect(goal.targetSkills).toEqual(['System design', 'Leadership']);

    // A bare goal (no enrichment yet) keeps empty target stacks.
    const bare = buildMilestones([makeExperience({ id: 'a' })], makeProfile({ target_role: 'Lead' }));
    const bareGoal = bare[bare.length - 1];
    expect(bareGoal.description).toBeNull();
    expect(bareGoal.targetTechnologies).toEqual([]);
    expect(bareGoal.targetSkills).toEqual([]);
  });
});

describe('buildActivities', () => {
  it('derives entries from every source and sorts newest first with a cap', () => {
    const experiences = [makeExperience({ id: 'exp-x', created_at: '2026-01-05T00:00:00Z' })];
    const skills = Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`,
      user_id: 'u',
      skill_name: `Skill ${i}`,
      level: 'advanced' as const,
      category: null,
      display_order: 0,
      created_at: `2026-02-${String(10 - i).padStart(2, '0')}T00:00:00Z`,
      updated_at: `2026-02-${String(10 - i).padStart(2, '0')}T00:00:00Z`,
    }));
    const activities = buildActivities({
      resumes: [makeResume()],
      analysesByResume: { 'cv-1': makeAnalysis() },
      experiences,
      skills,
      educations: [],
      certifications: [],
    });
    expect(activities).toHaveLength(6);
    expect(activities[0].type).toBe('analysis');
    expect(activities[0].score).toBe(72);
    const times = activities.map((a) => new Date(a.at).getTime());
    expect([...times].sort((x, y) => y - x)).toEqual(times);
  });
});

describe('deriveIsEmptyState', () => {
  it('is true only before identity, experience and CV exist', () => {
    const profile = makeProfile({ full_name: null });
    expect(deriveIsEmptyState(profile, [], [])).toBe(true);
    expect(deriveIsEmptyState(profile, [makeExperience()], [])).toBe(false);
    expect(deriveIsEmptyState(profile, [], [makeResume()])).toBe(false);
    expect(deriveIsEmptyState(makeProfile(), [], [])).toBe(false);
  });
});

describe('formatRelativeTime', () => {
  it('formats past timestamps for locale targets', () => {
    const iso = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(iso, 'fr')).toMatch(/2/);
    expect(formatRelativeTime(iso, 'en')).toMatch(/2/);
  });

  it('returns an empty string for invalid input', () => {
    expect(formatRelativeTime('not-a-date', 'fr')).toBe('');
  });
});


