'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentAdmin } from '@/lib/admin/guard';
import { writeAuditLog } from '@/lib/admin/audit';
import { checkRateLimit, sanitizeLikePattern, sanitizeText } from '@/lib/security/rate-limit';
import type {
  AdminFeedbackFilter,
  AdminFeedbackListResult,
  CreateFeedbackInput,
  FeedbackCategory,
  FeedbackStatus,
  UserFeedback,
} from '@/types/feedback';

const ALLOWED_CATEGORIES: ReadonlySet<FeedbackCategory> = new Set([
  'general',
  'bug',
  'feature',
  'interview',
  'cv_ats',
  'pricing',
  'other',
]);

const ALLOWED_STATUSES: ReadonlySet<FeedbackStatus> = new Set([
  'new',
  'in_progress',
  'resolved',
  'archived',
]);

interface DbFeedbackRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  category: string;
  rating: number | null;
  subject: string;
  message: string;
  page_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbRowToFeedback(row: DbFeedbackRow): UserFeedback {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    category: (ALLOWED_CATEGORIES.has(row.category as FeedbackCategory)
      ? row.category
      : 'general') as FeedbackCategory,
    rating: row.rating,
    subject: row.subject,
    message: row.message,
    pageUrl: row.page_url,
    status: (ALLOWED_STATUSES.has(row.status as FeedbackStatus)
      ? row.status
      : 'new') as FeedbackStatus,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Submits user feedback or a support message from the authenticated user.
 * Rate-limited to max 5 submissions per hour per user to prevent flooding.
 */
export async function submitFeedback(input: CreateFeedbackInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Vous devez être connecté pour envoyer un retour.' };
    }

    // Rate limiting: 5 feedback per hour per user
    const rateCheck = checkRateLimit(`feedback:${user.id}`, 5, 3600_000);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error:
          'Vous avez envoyé plusieurs messages récemment. Veuillez patienter avant de soumettre un nouveau retour.',
      };
    }

    const category = ALLOWED_CATEGORIES.has(input.category) ? input.category : 'general';
    const subject = sanitizeText(input.subject, 150);
    const message = sanitizeText(input.message, 3000);
    const pageUrl = input.pageUrl ? sanitizeText(input.pageUrl, 300) : null;
    const rating =
      typeof input.rating === 'number' && input.rating >= 1 && input.rating <= 5
        ? Math.round(input.rating)
        : null;

    if (subject.length < 3) {
      return { success: false, error: 'Le sujet doit comporter au moins 3 caractères.' };
    }

    if (message.length < 10) {
      return { success: false, error: 'Le message doit comporter au moins 10 caractères.' };
    }

    // Resolve user's profile full_name if available
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const userName = (profile as { full_name: string | null } | null)?.full_name ?? null;

    const { error: insertError } = await supabase.from('user_feedback').insert({
      user_id: user.id,
      user_email: user.email ?? null,
      user_name: userName,
      category,
      rating,
      subject,
      message,
      page_url: pageUrl,
      status: 'new',
    });

    if (insertError) {
      console.error('[feedback] submitFeedback insert failed:', insertError.message);
      return { success: false, error: 'Impossible d’enregistrer votre retour pour le moment.' };
    }

    // Best-effort audit log
    await writeAuditLog({
      actorId: user.id,
      action: 'feedback.create',
      targetType: 'user_feedback',
      payload: { category, rating, subject },
    });

    return { success: true };
  } catch (err) {
    console.error('[feedback] submitFeedback exception:', err);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
}

/**
 * Lists feedback for the admin panel with filtering, search, and pagination.
 */
export async function listFeedbackForAdmin(
  filters: AdminFeedbackFilter
): Promise<AdminFeedbackListResult | null> {
  const adminGuard = await getCurrentAdmin();
  if (!adminGuard.ok) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { status, category, query, page, pageSize } = filters;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let request = supabase
      .from('user_feedback')
      .select('*', { count: 'exact' });

    if (status && status !== 'all' && ALLOWED_STATUSES.has(status as FeedbackStatus)) {
      request = request.eq('status', status);
    }

    if (category && category !== 'all' && ALLOWED_CATEGORIES.has(category as FeedbackCategory)) {
      request = request.eq('category', category);
    }

    if (query && query.trim().length > 0) {
      const sanitized = sanitizeLikePattern(query);
      request = request.ilike('subject', `%${sanitized}%`);
    }

    request = request.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await request;

    if (error) {
      console.error('[admin] listFeedbackForAdmin failed:', error.message);
      return null;
    }

    const items = ((data ?? []) as DbFeedbackRow[]).map(mapDbRowToFeedback);
    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    console.error('[admin] listFeedbackForAdmin error:', err);
    return null;
  }
}

/**
 * Updates status and admin notes for a feedback entry.
 */
export async function updateFeedbackStatusAction(
  feedbackId: string,
  status: FeedbackStatus,
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const adminGuard = await getCurrentAdmin();
  if (!adminGuard.ok) {
    return { success: false, error: 'Action non autorisée.' };
  }

  if (!ALLOWED_STATUSES.has(status)) {
    return { success: false, error: 'Statut invalide.' };
  }

  try {
    const supabase = await createClient();
    const sanitizedNotes = adminNotes ? sanitizeText(adminNotes, 2000) : null;

    const { error } = await supabase
      .from('user_feedback')
      .update({
        status,
        admin_notes: sanitizedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);

    if (error) {
      console.error('[admin] updateFeedbackStatus failed:', error.message);
      return { success: false, error: error.message };
    }

    await writeAuditLog({
      actorId: adminGuard.userId,
      action: 'feedback.status_update',
      targetType: 'user_feedback',
      targetId: feedbackId,
      payload: { status, adminNotes: sanitizedNotes },
    });

    return { success: true };
  } catch (err) {
    console.error('[admin] updateFeedbackStatus exception:', err);
    return { success: false, error: 'Erreur inattendue.' };
  }
}

/**
 * Returns summary counts for the admin feedback overview.
 */
export async function getFeedbackSummaryStats(): Promise<{
  totalCount: number;
  newCount: number;
  inProgressCount: number;
  resolvedCount: number;
  averageRating: number | null;
}> {
  const fallback = {
    totalCount: 0,
    newCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    averageRating: null,
  };

  const adminGuard = await getCurrentAdmin();
  if (!adminGuard.ok) {
    return fallback;
  }

  try {
    const supabase = await createClient();

    const [allRes, newRes, progRes, resolvedRes, ratingRes] = await Promise.all([
      supabase.from('user_feedback').select('id', { count: 'exact', head: true }),
      supabase.from('user_feedback').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('user_feedback').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('user_feedback').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('user_feedback').select('rating').not('rating', 'is', null),
    ]);

    const ratings = (ratingRes.data ?? []) as Array<{ rating: number | null }>;
    const validRatings = ratings.map((r) => r.rating).filter((r): r is number => typeof r === 'number');
    const avg =
      validRatings.length > 0
        ? Number((validRatings.reduce((sum, v) => sum + v, 0) / validRatings.length).toFixed(1))
        : null;

    return {
      totalCount: allRes.count ?? 0,
      newCount: newRes.count ?? 0,
      inProgressCount: progRes.count ?? 0,
      resolvedCount: resolvedRes.count ?? 0,
      averageRating: avg,
    };
  } catch (err) {
    console.error('[admin] getFeedbackSummaryStats error:', err);
    return fallback;
  }
}
