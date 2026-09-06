/**
 * Types for the User Feedback & Support system.
 */

export type FeedbackCategory =
  | 'general'
  | 'bug'
  | 'feature'
  | 'interview'
  | 'cv_ats'
  | 'pricing'
  | 'other';

export type FeedbackStatus = 'new' | 'in_progress' | 'resolved' | 'archived';

export interface UserFeedback {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  category: FeedbackCategory;
  rating: number | null;
  subject: string;
  message: string;
  pageUrl: string | null;
  status: FeedbackStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  category: FeedbackCategory;
  rating?: number | null;
  subject: string;
  message: string;
  pageUrl?: string | null;
}

export interface AdminFeedbackFilter {
  status?: FeedbackStatus | 'all';
  category?: FeedbackCategory | 'all';
  query?: string;
  page: number;
  pageSize: number;
}

export interface AdminFeedbackListResult {
  items: UserFeedback[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
