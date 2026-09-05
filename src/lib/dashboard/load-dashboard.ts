import { cache } from 'react';
import { getCurrentUserProfile } from '@/lib/supabase/profiles';
import { getLatestCompletedAnalysesByResume, getUserResumes } from '@/lib/supabase/resumes';
import {
  getRoadmap,
  listCertifications,
  listEducations,
  listExperiences,
  listSkills,
} from '@/lib/supabase/profile-extensions';
import { buildDashboardViewData } from '@/lib/dashboard/adapters';
import type { DashboardViewData } from '@/types/dashboard';
import type { Profile } from '@/types/profile';

export interface DashboardLoadResult {
  data: DashboardViewData;
  profile: Profile | null;
  /** Number of certifications (used by the full roadmap metric bar). */
  certificationsCount: number;
}

/**
 * Server-side dashboard loader, memoized with React `cache` so the layout
 * (sidebar/header user card) and the page share a single set of Supabase
 * queries per server render — no duplicate fetches.
 */
export const getDashboardViewData = cache(async (): Promise<DashboardLoadResult> => {
  const [
    profileResult,
    resumesResult,
    analysesResult,
    roadmapResult,
    experiencesResult,
    skillsResult,
    educationsResult,
    certificationsResult,
  ] = await Promise.all([
    getCurrentUserProfile(),
    getUserResumes(),
    getLatestCompletedAnalysesByResume(),
    getRoadmap(),
    listExperiences(),
    listSkills(),
    listEducations(),
    listCertifications(),
  ]);

  const { data: profile } = profileResult;
  const resumes = resumesResult.data ?? [];
  const analysesByResume = analysesResult.data;
  const roadmap = roadmapResult.data;
  const experiences = experiencesResult.data ?? [];
  const skills = skillsResult.data ?? [];
  const educations = educationsResult.data ?? [];
  const certifications = certificationsResult.data ?? [];

  const data = buildDashboardViewData({
    profile,
    experiences,
    skills,
    educations,
    certifications,
    resumes,
    analysesByResume,
    roadmap,
  });

  return { data, profile, certificationsCount: certifications.length };
});