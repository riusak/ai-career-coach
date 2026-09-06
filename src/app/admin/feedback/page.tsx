import { getTranslations } from 'next-intl/server';
import ErrorState from '@/components/ui/ErrorState';
import { getCurrentAdmin } from '@/lib/admin/guard';
import { getFeedbackSummaryStats, listFeedbackForAdmin } from '@/lib/feedback/actions';
import AdminFeedbackView from '@/components/admin/AdminFeedbackView';
import type { FeedbackCategory, FeedbackStatus } from '@/types/feedback';

export const metadata = {
  title: 'Retours Utilisateurs & Support — Admin | ForPro AI',
  description: 'Gestion des retours, signalements et messages au support.',
};

const PAGE_SIZE = 25;

interface AdminFeedbackPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminFeedbackPage({ searchParams }: AdminFeedbackPageProps) {
  const [admin, t] = await Promise.all([getCurrentAdmin(), getTranslations('admin')]);

  if (!admin.ok) {
    return (
      <ErrorState
        title={t('accessDenied.titleShort')}
        description={t('accessDenied.onlyAdmins')}
      />
    );
  }

  const sp = await searchParams;
  const statusParam = typeof sp.status === 'string' ? sp.status : 'all';
  const categoryParam = typeof sp.category === 'string' ? sp.category : 'all';
  const queryParam = typeof sp.query === 'string' ? sp.query : '';
  const pageParam = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const [feedbackData, stats] = await Promise.all([
    listFeedbackForAdmin({
      status: (statusParam as FeedbackStatus | 'all'),
      category: (categoryParam as FeedbackCategory | 'all'),
      query: queryParam,
      page: pageParam,
      pageSize: PAGE_SIZE,
    }),
    getFeedbackSummaryStats(),
  ]);

  return (
    <AdminFeedbackView
      initialData={feedbackData}
      summaryStats={stats}
      currentStatus={statusParam}
      currentCategory={categoryParam}
      currentQuery={queryParam}
    />
  );
}
