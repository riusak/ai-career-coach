export type UserRole = 'user' | 'admin';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type AppLocaleCode = 'fr' | 'en' | 'de';

export interface Profile {
  id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  role: UserRole;
  avatar_url: string | null;
  banner_url: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  preferred_locale: AppLocaleCode | null;
  /**
   * Aspirational career goal (migration 012): target job title + year
   * (e.g. « Lead Architect by 2030 »). Rendered as the flag-icon « Goal »
   * milestone at the end of the career-roadmap timeline.
   */
  target_role: string | null;
  target_year: number | null;
  /**
   * Enriched career-objective baseline (migration 014): free-form description
   * plus the target technologies / skills expected for the goal. These fields
   * are the core baseline dataset for the future career-fit evaluations in
   * Analytics (gap analysis: current profile vs objective).
   */
  target_description: string | null;
  target_technologies: string[] | null;
  target_skills: string[] | null;
  /**
   * One-time onboarding persistence (migration 013): set when the user
   * completes or explicitly dismisses the first-connection wizard. NULL means
   * the wizard may still be shown; a non-null value permanently disables the
   * full-screen flow (the dashboard helper widget remains available).
   */
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'full_name'
    | 'headline'
    | 'bio'
    | 'phone'
    | 'location'
    | 'linkedin_url'
    | 'github_url'
    | 'website_url'
    | 'preferred_locale'
    | 'target_role'
    | 'target_year'
    | 'target_description'
    | 'target_technologies'
    | 'target_skills'
  >
>;

export interface ProfileResponse<T> {
  data: T | null;
  error: string | null;
}

export interface ProfileEducation {
  id: string;
  user_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type ProfileEducationInput = Omit<
  ProfileEducation,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export interface ProfileExperience {
  id: string;
  user_id: string;
  company: string;
  role: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  display_order: number;
  /**
   * Career-roadmap enrichments (migration 010). Nullable until the profile
   * form populates them; the dashboard renders fine without them.
   */
  key_missions?: string[] | null;
  technologies?: string[] | null;
  domain?: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileExperienceInput = Omit<
  ProfileExperience,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export interface ProfileSkill {
  id: string;
  user_id: string;
  skill_name: string;
  level: SkillLevel;
  category: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type ProfileSkillInput = Omit<
  ProfileSkill,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export interface ProfileCertification {
  id: string;
  user_id: string;
  name: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type ProfileCertificationInput = Omit<
  ProfileCertification,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export interface ProfileRoadmap {
  user_id: string;
  stage: 1 | 2 | 3 | 4;
  progress_percent: number;
  updated_at: string;
}