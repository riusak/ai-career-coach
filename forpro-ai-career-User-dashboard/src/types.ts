export interface UserProfile {
  id: string;
  name: string;
  title: string;
  email: string;
  avatarUrl?: string;
  plan?: string;
  profileStrength: number;
  totalYearsExp: number;
  isEmptyState?: boolean;
}

export interface CareerMilestone {
  id: string;
  year: string;
  yearRange: string;
  role: string;
  company: string;
  description: string;
  keyMissions: string[];
  technologies: string[];
  domain: 'frontend' | 'backend' | 'architecture' | 'devops' | 'mobile';
  companyLogo?: 'up' | 'cube' | 'gva' | 'moov' | 'custom';
  isCurrent?: boolean;
  isGoal?: boolean;
}

export interface CVAnalysisResult {
  atsScore: number;
  grammarScore: number;
  keywordsMatchScore: number;
  impactScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendedJobTitles: string[];
}

export interface CVDocument {
  id: string;
  name: string;
  lastUpdated: string;
  score: number;
  size: string;
  isPrimary?: boolean;
  roleTarget?: string;
  version?: string;
  fileData?: string;
  fileType?: string;
  parsedContent?: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
    experiences: {
      role: string;
      company: string;
      period: string;
      highlights: string[];
    }[];
    skills: string[];
    education: {
      degree: string;
      school: string;
      year: string;
    }[];
    certifications?: string[];
  };
  analysis?: CVAnalysisResult;
}

export interface ActivityItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type?: 'cv' | 'milestone' | 'skill' | 'interview';
}

export interface DonutSegment {
  label: string;
  percentage: number;
  years: number;
  color: string;
}

export interface MetricStat {
  label: string;
  value: string | number;
  iconName: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  workplaceType: 'remote' | 'hybrid' | 'onsite';
  contractType: 'cdi' | 'contract' | 'freelance';
  department: 'architecture' | 'backend' | 'devops' | 'leadership' | 'fullstack';
  salary: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceLevel: 'Mid' | 'Senior' | 'Lead' | 'Staff' | 'Principal';
  postedDate: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  isSaved?: boolean;
  isApplied?: boolean;
  appliedDate?: string;
}

export interface JobOfferMatch {
  id: string;
  cvId: string;
  cvName: string;
  jobTitle: string;
  company: string;
  location?: string;
  offerSource: 'file' | 'url' | 'text';
  offerFileName?: string;
  offerUrl?: string;
  matchScore: number;
  technicalMatchScore: number;
  experienceMatchScore: number;
  softSkillsMatchScore: number;
  date: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
  jobDescription?: string;
}

export interface MockInterviewSession {
  id: string;
  jobTitle: string;
  company: string;
  matchId?: string;
  date: string;
  duration: string;
  score: number;
  clarityScore: number;
  depthScore: number;
  language: 'fr' | 'en';
  mode: 'audio' | 'text';
  feedback: string;
  strengths: string[];
  recommendations: string[];
}

export interface UserSettings {
  language: 'en' | 'fr';
  currency: 'EUR' | 'USD' | 'XOF';
  coachTone: 'strict' | 'supportive';
  aiModel: string;
  emailAlerts: boolean;
  weeklyDigest: boolean;
  anonymizeProfile: boolean;
  remoteOnlyPreference: boolean;
}

export interface TourStep {
  id: string;
  targetId: string;
  title: string;
  description: string;
  badge?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}
