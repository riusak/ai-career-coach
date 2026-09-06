import type {
  DashboardActivity,
  AnalysisSubscores,
  CvDetailData,
  CvSummaryData,
  DashboardUser,
  DashboardViewData,
  MilestoneData,
  ProfileMetrics,
} from '@/types/dashboard';
import type {
  Profile,
  ProfileCertification,
  ProfileEducation,
  ProfileExperience,
  ProfileRoadmap,
  ProfileSkill,
} from '@/types/profile';
import type { Resume, ResumeAnalysis } from '@/types/resume';
import type { ScoreBreakdownItem } from '@/types/quick-test';
import { parseDeepAnalysisOutput } from '@/lib/analysis/deep-output';

/**
 * Pure adapters turning raw Supabase rows into the dashboard's client view
 * model (src/types/dashboard.ts). Everything here is deterministic and
 * unit-tested (adapters.test.ts); locale-aware formatting deliberately stays
 * in the client components so the server payload stays language-agnostic.
 */

/** Cap for the CV paper-preview raw text carried in the RSC payload. */
const RAW_TEXT_PREVIEW_LIMIT = 20_000;

/** Max number of derived recent-activity entries sent to the client. */
const ACTIVITY_LIMIT = 6;

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.4375;

/** Sums the duration of every experience in decimal years (current = now). */
export function computeTotalYearsExp(experiences: ProfileExperience[]): number {
  const now = Date.now();
  const totalMonths = experiences.reduce((sum, exp) => {
    const start = exp.start_date ? new Date(exp.start_date).getTime() : null;
    const end =
      exp.is_current && !exp.end_date
        ? now
        : exp.end_date
          ? new Date(exp.end_date).getTime()
          : null;
    if (!start || !end || end <= start) {
      return sum;
    }
    return sum + (end - start) / MONTH_MS;
  }, 0);
  return Math.round((totalMonths / 12) * 10) / 10;
}

export interface ProfileStrengthInput {
  profile: Profile | null;
  experiences: ProfileExperience[];
  skills: ProfileSkill[];
  educations: ProfileEducation[];
  certifications: ProfileCertification[];
  resumeCount: number;
  analysisCount: number;
}

/**
 * Weighted 0–100 profile-strength heuristic (server-computed, replaces the
 * template's hardcoded score): identity 30, experience 25, education &
 * certifications 15, skills 15, CV & analysis 15.
 */
export function computeProfileStrength(input: ProfileStrengthInput): number {
  const { profile, experiences, skills, educations, certifications, resumeCount, analysisCount } =
    input;

  let identity = 0;
  if (profile) {
    if (profile.full_name?.trim()) identity += 10;
    if (profile.headline?.trim()) identity += 8;
    if (profile.bio?.trim()) identity += 6;
    if (profile.avatar_url) identity += 3;
    if (profile.phone?.trim() || profile.location?.trim()) identity += 3;
  }

  const hasCurrent = experiences.some((exp) => exp.is_current);
  let experience = 0;
  if (experiences.length === 1) experience = 15;
  else if (experiences.length >= 2) experience = 20;
  if (hasCurrent) experience += 5;

  const education = (educations.length > 0 ? 8 : 0) + (certifications.length > 0 ? 7 : 0);
  const skillScore = Math.min(15, skills.length * 3);
  const cvScore = (resumeCount > 0 ? 8 : 0) + (analysisCount > 0 ? 7 : 0);

  return Math.min(100, identity + experience + education + skillScore + cvScore);
}

/** The five Profile-Overview metric bars (0–100 each). */
export function buildProfileMetrics(
  input: ProfileStrengthInput,
  bestScore: number | null
): ProfileMetrics {
  const { experiences, skills, educations, certifications } = input;
  return {
    skills: Math.min(100, skills.length * 20),
    experience: Math.min(100, experiences.length * 25),
    education: Math.min(100, educations.length * 50),
    certifications: Math.min(100, certifications.length * 50),
    resumeQuality: bestScore ?? 0,
  };
}

/**
 * Maps the free-form LLM score breakdown onto the three fixed ATS sub-cards
 * ("Impact & Chiffres", "Correspondance Mots-Clés", "Grammaire & Clarté").
 * Falls back to the global score for dimensions the engine did not emit.
 */
export function mapSubscores(
  breakdown: ScoreBreakdownItem[],
  fallback: number
): AnalysisSubscores {
  const scoreFor = (pattern: RegExp): number =>
    clampScore(breakdown.find((item) => pattern.test(item.category))?.score ?? fallback);

  return {
    impact: scoreFor(/impact|chiffre|m[ée]trique|metric/i),
    keywords: scoreFor(/mots?[- ]?cl[ée]s?|keyword|pertinence|ad[ée]quation/i),
    grammar: scoreFor(/structure|lisib|gramma|clart[ée]|orthog|langue|style|format/i),
  };
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Defensively coerces the optional jsonb string-array columns. */
function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

/** Heuristic mapping between a company name and the template badge variant. */
export function deriveCompanyLogo(company: string): MilestoneData['companyLogo'] {
  const name = company.toLowerCase();
  if (/upwork/i.test(name)) return 'up';
  if (/devlab|togotech|cube|studio/i.test(name)) return 'cube';
  if (/gva|group/i.test(name)) return 'gva';
  if (/moov|africa/i.test(name)) return 'moov';
  return 'custom';
}

/** Short year (e.g. "2023") from an ISO date, '' when unavailable. */
function yearOf(date: string | null): string {
  if (!date) return '';
  const year = new Date(date).getFullYear();
  return Number.isNaN(year) ? '' : String(year);
}

/** Builds the career-roadmap milestones (oldest → current). */
export function buildMilestones(
  experiences: ProfileExperience[],
  profile?: Profile | null
): MilestoneData[] {
  const milestones: MilestoneData[] = [...experiences]
    .sort((a, b) => {
      const aTime = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const bTime = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return aTime - bTime;
    })
    .map((exp) => {
      const startYear = yearOf(exp.start_date);
      const endYear = yearOf(exp.end_date);
      const yearRange = exp.is_current
        ? startYear
          ? `${startYear} - Present`
          : 'Present'
        : startYear && endYear
          ? `${startYear} - ${endYear}`
          : startYear || endYear || '—';

      return {
        id: exp.id,
        role: exp.role,
        company: exp.company,
        description: exp.description,
        startDate: exp.start_date,
        endDate: exp.end_date,
        isCurrent: exp.is_current,
        keyMissions: toStringArray(exp.key_missions),
        technologies: toStringArray(exp.technologies),
        domain: exp.domain ?? null,
        year: startYear,
        yearRange,
        companyLogo: deriveCompanyLogo(exp.company),
      };
    });

  // Migration 012 — the explicit career goal anchors the « summit » node of
  // the roadmap timeline (flag icon). Without a set goal, the template keeps
  // its legacy fallback (the last milestone is treated as the goal).
  // Chart 3 / migration 014 — the enriched objective baseline (description +
  // target technologies/skills) rides along on the goal milestone so the
  // roadmap modal and Analytics can surface the career-fit dataset.
  const goalRole = profile?.target_role?.trim();
  if (goalRole) {
    milestones.push({
      id: 'career-goal',
      role: goalRole,
      company: '',
      description: profile?.target_description?.trim() || null,
      startDate: null,
      endDate: null,
      isCurrent: false,
      keyMissions: [],
      technologies: [],
      domain: null,
      year: profile?.target_year ? String(profile.target_year) : '',
      yearRange: profile?.target_year ? `Objectif ${profile.target_year}` : 'Objectif',
      companyLogo: 'custom',
      targetTechnologies: toStringArray(profile?.target_technologies),
      targetSkills: toStringArray(profile?.target_skills),
      isGoal: true,
    });
  }

  return milestones;
}


/**
 * Builds the light CV summaries for management pages (the /dashboard/cvs
 * grid): no parsed raw text is carried, only card-level metadata.
 * `sizesByPath` (optional, storage path → bytes) feeds the file-size chip.
 */
export function buildCvSummaries(
  resumes: Resume[],
  analysesByResume: Record<string, ResumeAnalysis> | null,
  sizesByPath?: Record<string, number> | null
): CvSummaryData[] {
  return resumes.map((resume) => {
    const analysis = analysesByResume?.[resume.id] ?? null;
    const score =
      analysis?.score !== null && analysis?.score !== undefined
        ? clampScore(analysis.score)
        : null;
    return {
      id: resume.id,
      name: resume.file_name,
      label: resume.label,
      isPrimary: resume.is_primary,
      createdAt: resume.created_at,
      score,
      hasAnalysis: score !== null,
      sizeBytes: sizesByPath?.[resume.file_path] ?? null,
    };
  });
}

/**
 * Builds the CV cards + their preview-modal payload from raw rows.
 * `sizesByPath` (optional, storage path → bytes) feeds the header metadata.
 */
export function buildCvDetails(
  resumes: Resume[],
  analysesByResume: Record<string, ResumeAnalysis> | null,
  sizesByPath?: Record<string, number> | null
): CvDetailData[] {
  return resumes.map((resume) => {
    const analysis = analysesByResume?.[resume.id] ?? null;
    const parsed =
      analysis?.score !== null && analysis?.score !== undefined
        ? parseDeepAnalysisOutput(analysis.structured_output)
        : null;
    const deepAnalysis = parsed?.analysis ?? null;

    const rawText = resume.parsed_content?.raw_text ?? null;
    const truncated = rawText !== null && rawText.length > RAW_TEXT_PREVIEW_LIMIT;

    // The template hero shows a one-line summary; the deep analysis has no
    // global summary field, so the top recommendation plays that role
    // (recommendations are NOT repeated in the strengths/improvements lists).
    const topRecommendation = deepAnalysis?.recommendations[0] ?? null;

    return {
      id: resume.id,
      name: resume.file_name,
      label: resume.label,
      isPrimary: resume.is_primary,
      createdAt: resume.created_at,
      score:
        analysis?.score !== null && analysis?.score !== undefined
          ? clampScore(analysis.score)
          : null,
      subscores: deepAnalysis
        ? mapSubscores(deepAnalysis.scoreBreakdown, deepAnalysis.score)
        : null,
      summary: topRecommendation
        ? `${topRecommendation.title} — ${topRecommendation.detail}`
        : null,
      strengths: deepAnalysis?.strengths ?? [],
      weaknesses: deepAnalysis?.weaknesses ?? [],
      recommendations: deepAnalysis?.recommendations ?? [],
      rawText: truncated ? rawText.slice(0, RAW_TEXT_PREVIEW_LIMIT) : rawText,
      rawTextTruncated: truncated,
      wordCount: resume.parsed_content?.word_count ?? null,
      sizeBytes: sizesByPath?.[resume.file_path] ?? null,
    };
  });
}

/** Derives the recent-activity feed from existing row timestamps (no table). */
export function buildActivities(input: {
  resumes: Resume[];
  analysesByResume: Record<string, ResumeAnalysis> | null;
  experiences: ProfileExperience[];
  skills: ProfileSkill[];
  educations: ProfileEducation[];
  certifications: ProfileCertification[];
}): DashboardActivity[] {
  const { resumes, analysesByResume, experiences, skills, educations, certifications } = input;
  const activities: DashboardActivity[] = [];

  for (const resume of resumes) {
    activities.push({
      id: `cv-${resume.id}`,
      type: 'cv',
      at: resume.created_at,
      titleKey: 'activityCvUploaded',
      detail: resume.file_name,
    });
  }

  if (analysesByResume) {
    const resumeNameById = new Map(resumes.map((resume) => [resume.id, resume.file_name]));
    for (const analysis of Object.values(analysesByResume)) {
      if (analysis.score === null) continue;
      activities.push({
        id: `analysis-${analysis.resume_id}-${analysis.created_at}`,
        type: 'analysis',
        at: analysis.created_at,
        titleKey: 'activityAnalysisCompleted',
        detail: resumeNameById.get(analysis.resume_id) ?? '',
        score: analysis.score,
      });
    }
  }

  for (const exp of experiences) {
    activities.push({
      id: `exp-${exp.id}`,
      type: 'experience',
      at: exp.created_at || exp.updated_at,
      titleKey: 'activityExperienceAdded',
      detail: `${exp.role} · ${exp.company}`,
    });
  }

  for (const edu of educations) {
    activities.push({
      id: `edu-${edu.id}`,
      type: 'education',
      at: edu.created_at,
      titleKey: 'activityEducationAdded',
      detail: edu.institution,
    });
  }

  for (const cert of certifications) {
    activities.push({
      id: `cert-${cert.id}`,
      type: 'certification',
      at: cert.created_at,
      titleKey: 'activityCertificationAdded',
      detail: cert.name,
    });
  }

  for (const skill of skills) {
    activities.push({
      id: `skill-${skill.id}`,
      type: 'skill',
      at: skill.created_at,
      titleKey: 'activitySkillAdded',
      detail: skill.skill_name,
    });
  }

  return activities
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, ACTIVITY_LIMIT);
}

/**
 * First-connection detection: no identity filled, no experience and no CV
 * uploaded yet (matches the Phase 1 empty-state contract).
 */
export function deriveIsEmptyState(
  profile: Profile | null,
  experiences: ProfileExperience[],
  resumes: Resume[]
): boolean {
  const hasIdentity = Boolean(
    profile?.full_name?.trim() || profile?.headline?.trim() || profile?.bio?.trim()
  );
  return !hasIdentity && experiences.length === 0 && resumes.length === 0;
}

/** Assembles the template-style user card (sidebar footer + header). */
export function buildDashboardUser(input: {
  profile: Profile | null;
  profileStrength: number;
  totalYearsExp: number;
  isEmptyState: boolean;
}): DashboardUser {
  const { profile, profileStrength, totalYearsExp, isEmptyState } = input;
  return {
    name: profile?.full_name?.trim() || 'ForPro User',
    title: profile?.headline?.trim() || '',
    email: null,
    avatarUrl: profile?.avatar_url ?? null,
    plan: 'Free Plan',
    profileStrength,
    totalYearsExp,
    isEmptyState,
  };
}

/** Assembles the full serializable view model for the dashboard client root. */
export function buildDashboardViewData(input: {
  profile: Profile | null;
  experiences: ProfileExperience[];
  skills: ProfileSkill[];
  educations: ProfileEducation[];
  certifications: ProfileCertification[];
  resumes: Resume[];
  analysesByResume: Record<string, ResumeAnalysis> | null;
  roadmap: ProfileRoadmap | null;
  /** Optional storage path → bytes map for the CV file-size chips. */
  sizesByPath?: Record<string, number> | null;
}): DashboardViewData {
  const {
    profile,
    experiences,
    skills,
    educations,
    certifications,
    resumes,
    analysesByResume,
    roadmap,
    sizesByPath,
  } = input;

  const completedAnalyses = Object.values(analysesByResume ?? {}).filter(
    (analysis) => analysis.score !== null
  );
  const bestScore = completedAnalyses.reduce<number | null>(
    (best, analysis) =>
      analysis.score !== null && (best === null || analysis.score > best)
        ? clampScore(analysis.score)
        : best,
    null
  );

  const strengthInput: ProfileStrengthInput = {
    profile,
    experiences,
    skills,
    educations,
    certifications,
    resumeCount: resumes.length,
    analysisCount: completedAnalyses.length,
  };

  return {
    isEmptyState: deriveIsEmptyState(profile, experiences, resumes),
    profileStrength: computeProfileStrength(strengthInput),
    totalYearsExp: computeTotalYearsExp(experiences),
    metrics: buildProfileMetrics(strengthInput, bestScore),
    roadmapProgress: roadmap?.progress_percent ?? null,
    milestones: buildMilestones(experiences, profile),
    cvs: buildCvDetails(resumes, analysesByResume, sizesByPath),
    user: buildDashboardUser({
      profile,
      profileStrength: computeProfileStrength(strengthInput),
      totalYearsExp: computeTotalYearsExp(experiences),
      isEmptyState: deriveIsEmptyState(profile, experiences, resumes),
    }),
    activities: buildActivities({
      resumes,
      analysesByResume,
      experiences,
      skills,
      educations,
      certifications,
    }),
    primaryCvId: resumes.find((resume) => resume.is_primary)?.id ?? resumes[0]?.id ?? null,
  };
}

