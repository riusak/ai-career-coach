import type { InsightItem, RecommendationItem } from '@/types/quick-test';

/**
 * Client-side view model for the migrated « Career Dashboard » (Phase 2).
 * Built by src/lib/dashboard/adapters.ts from raw Supabase rows inside the
 * dashboard server component, then passed as serializable props to the
 * client components (no localStorage, no client-side fetching).
 */

/** Kinds of derived recent-activity entries (decision: derive, no table). */
export type DashboardActivityType =
  | 'cv'
  | 'analysis'
  | 'experience'
  | 'education'
  | 'certification'
  | 'skill'
  | 'interview';

/** Translation keys allowed for activity titles (keeps t() typed & finite). */
export type DashboardActivityTitleKey =
  | 'activityCvUploaded'
  | 'activityAnalysisCompleted'
  | 'activityExperienceAdded'
  | 'activityEducationAdded'
  | 'activityCertificationAdded'
  | 'activitySkillAdded'
  | 'activityInterviewCompleted';

export interface DashboardActivity {
  id: string;
  type: DashboardActivityType;
  /** ISO 8601 timestamp of the underlying row (formatted client-side). */
  at: string;
  titleKey: DashboardActivityTitleKey;
  /** Free detail line: file name, role @ company, skill name… */
  detail: string;
  /** Populated for completed analyses (drives the score chip). */
  score?: number;
}

/** One CV card of the « Vos CVs » grid + the payload of its preview modal. */
export interface CvDetailData {
  id: string;
  name: string;
  label: string | null;
  isPrimary: boolean;
  /** ISO timestamp used for the "added on" line. */
  createdAt: string;
  /** Latest completed analysis global score (null = never analyzed). */
  score: number | null;
  /** Score breakdown mapped to the 3 fixed sub-cards (null = no analysis). */
  subscores: AnalysisSubscores | null;
  /** Analysis summary line shown in the ATS diagnostic hero. */
  summary: string | null;
  strengths: InsightItem[];
  weaknesses: InsightItem[];
  recommendations: RecommendationItem[];
  /** Truncated raw text extracted by the parsing pipeline (paper preview). */
  rawText: string | null;
  rawTextTruncated: boolean;
  wordCount: number | null;
  /** Stored file size in bytes (null = Storage metadata unavailable). */
  sizeBytes: number | null;
}

/** Light CV card for management pages (no raw text — keeps payloads small). */
export interface CvSummaryData {
  id: string;
  name: string;
  label: string | null;
  isPrimary: boolean;
  /** ISO timestamp used for the "added on" line. */
  createdAt: string;
  /** Latest completed analysis global score (null = never analyzed). */
  score: number | null;
  /** True when a completed analysis exists for this CV. */
  hasAnalysis: boolean;
  /** Stored file size in bytes (null = Storage metadata unavailable). */
  sizeBytes: number | null;
}

/** The three fixed sub-cards of the ATS diagnostic layout. */
export interface AnalysisSubscores {
  impact: number;
  keywords: number;
  grammar: number;
}

/** One career-roadmap milestone rendered from a profile_experience row. */
export interface MilestoneData {
  id: string;
  role: string;
  company: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  keyMissions: string[];
  technologies: string[];
  domain: string | null;
  /** Short year label (e.g. "2023") — used by the mountain-badge roadmaps. */
  year: string;
  /** Human period label (e.g. "2021 - Present") — used by modals & grids. */
  yearRange: string;
  /** Company badge variant of the template (up/cube/gva/moov/custom). */
  companyLogo: 'up' | 'cube' | 'gva' | 'moov' | 'custom';
  /**
   * Chart 3 — aspirational target stack carried from the enriched career goal
   * (migration 014). Populated on the « goal » milestone only; they are the
   * baseline dataset for the future career-fit evaluations in Analytics.
   */
  targetTechnologies?: string[];
  targetSkills?: string[];
  /** True for the aspirational « target goal » summit node. */
  isGoal?: boolean;
}

/** Summary of the authenticated user for the template sidebar/header. */
export interface DashboardUser {
  name: string;
  title: string;
  email: string | null;
  avatarUrl: string | null;
  plan: string;
  profileStrength: number;
  totalYearsExp: number;
  isEmptyState: boolean;
}

/** The five metric bars of the Profile Overview donut card (0–100 each). */
export interface ProfileMetrics {
  skills: number;
  experience: number;
  education: number;
  certifications: number;
  resumeQuality: number;
}

/** Aggregated mock-interview practice stats for the Analytics page. */
export interface SimulationStatsData {
  /** Number of interview simulation sessions ever started. */
  total: number;
  /** Sessions completed with a full STAR debrief. */
  completed: number;
  /** Sessions still in progress or abandoned. */
  inProgress: number;
  /** Average STAR score over evaluated sessions (null when none scored). */
  averageScore: number | null;
  /** Best STAR score over evaluated sessions (null when none scored). */
  bestScore: number | null;
}

/** Everything the client dashboard root (DashboardView) needs, precomputed. */
export interface DashboardViewData {
  isEmptyState: boolean;
  profileStrength: number;
  totalYearsExp: number;
  metrics: ProfileMetrics;
  roadmapProgress: number | null;
  milestones: MilestoneData[];
  cvs: CvDetailData[];
  activities: DashboardActivity[];
  primaryCvId: string | null;
  /** Aggregated mock-interview practice stats (Analytics page). */
  simulations: SimulationStatsData;
  /** Template-style user card (sidebar footer + header welcome). */
  user: DashboardUser;
}