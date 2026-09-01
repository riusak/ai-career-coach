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