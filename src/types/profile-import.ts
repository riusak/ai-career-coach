import type { SkillLevel } from '@/types/profile';

/**
 * Shared types for the « Smart Profile Import » feature — the LLM-extracted
 * career profile produced from a LinkedIn PDF / standard resume upload.
 * The extraction module (src/lib/profile-import/extract.ts) and the server
 * action consuming it must stay in sync on these shapes.
 */

export interface ImportedExperience {
  company: string;
  role: string;
  description?: string | null;
  /** ISO date string (YYYY-MM-DD or YYYY-MM) — nullable when unknown. */
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  technologies?: string[];
  key_missions?: string[];
}

export interface ImportedEducation {
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
}

export interface ImportedSkill {
  skill_name: string;
  level: SkillLevel;
  category?: string | null;
}

export interface ImportedCertification {
  name: string;
  issuer?: string | null;
  issue_date?: string | null;
}

/**
 * Full structured output of the LLM extraction. Identity fields fall back to
 * null when absent; lists are always present (possibly empty).
 */
export interface ProfileImportExtraction {
  full_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  experiences: ImportedExperience[];
  skills: ImportedSkill[];
  educations: ImportedEducation[];
  certifications: ImportedCertification[];
}

/** Summary returned to the client after a successful import. */
export interface ProfileImportSummary {
  experiences: number;
  skills: number;
  educations: number;
  certifications: number;
  /** Identity fields that were backfilled on the profile (count). */
  profileFields: number;
}

/** Machine-readable state of the import server action. */
export type ProfileImportState = {
  success: boolean;
  message: string | null;
  resumeId: string | null;
  fileName: string | null;
  summary: ProfileImportSummary | null;
};