export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<Pick<Profile, 'full_name' | 'headline' | 'bio'>>;

export interface ProfileResponse<T> {
  data: T | null;
  error: string | null;
}
