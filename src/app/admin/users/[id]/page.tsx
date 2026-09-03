import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import RoleBadge from '@/components/admin/RoleBadge';
import RoleToggleForm from '@/components/admin/RoleToggleForm';
import DeleteUserButton from '@/components/admin/DeleteUserButton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { getAdminUserDetail } from '@/lib/admin/users';
import { getCurrentAdmin } from '@/lib/admin/guard';
import { formatDateTime } from '@/lib/admin/utils';

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
}

const TH =
  'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-navy-500';
const TD = 'px-4 py-2 align-top text-sm text-navy-900';

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  const [admin, t] = await Promise.all([getCurrentAdmin(), getTranslations('admin')]);

  if (!admin.ok) {
    return (
      <ErrorState
        title={t('accessDenied.titleShort')}
        description={t('accessDenied.onlyAdminsView')}
      />
    );
  }

  const { id } = await params;
  const detail = await getAdminUserDetail(id);

  if (!detail) {
    notFound();
  }

  const isSelf = detail.user.id === admin.userId;
  const isAdmin = detail.user.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            {detail.user.full_name || t('users.unnamed')}
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            {detail.user.email ?? t('users.noEmail')}
          </p>
        </div>
        <Link
          href="/admin/users"
          className="ml-auto rounded-md border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-800"
        >
          {t('users.backToUsers')}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: identity */}
        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="text-lg font-semibold text-navy-900">{t('users.profile')}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-navy-500">{t('users.role')}</dt>
              <dd className="mt-1">
                <RoleBadge role={detail.user.role} label={t(`roles.${detail.user.role}`)} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-navy-500">{t('users.fullName')}</dt>
              <dd className="mt-1 text-navy-900">
                {detail.user.full_name || (
                  <span className="italic text-navy-400">{t('users.notSet')}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-navy-500">{t('users.email')}</dt>
              <dd className="mt-1 break-all text-navy-900">
                {detail.user.email ?? '—'}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <dt className="font-medium text-navy-500">{t('users.created')}</dt>
                <dd className="mt-1 text-navy-900">
                  {formatDateTime(detail.user.created_at)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-navy-500">{t('users.updated')}</dt>
                <dd className="mt-1 text-navy-900">
                  {formatDateTime(detail.user.updated_at)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="font-medium text-navy-500">{t('users.lastSignIn')}</dt>
                <dd className="mt-1 text-navy-900">
                  {detail.user.last_sign_in_at ? (
                    formatDateTime(detail.user.last_sign_in_at)
                  ) : (
                    <span className="italic text-navy-400">{t('users.never')}</span>
                  )}
                </dd>
              </div>
            </div>
          </dl>
        </div>
                {/* Middle: content summary */}
        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-navy-900">
            {t('users.resumesTitle')}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-navy-500">{t('users.resumesTitle')}</dt>
              <dd className="text-navy-900">{detail.resumes.length} CV(s)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-navy-500">{t('users.analysesCount', { count: 0 })}</dt>
              <dd className="text-navy-900">{detail.analysis_count}</dd>
            </div>
            {detail.latestAnalysis && (
              <div className="flex justify-between">
                <dt className="font-medium text-navy-500">{t('users.latestAnalysis')}</dt>
                <dd className="text-right text-navy-900">
                  <span className="font-medium">
                    {detail.latestAnalysis.score ?? '—'}
                  </span>
                  <span className="ml-1 text-xs text-navy-500">
                    ({detail.latestAnalysis.analysis_type})
                  </span>
                </dd>
              </div>
            )}
          </dl>

          {detail.resumes.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TH}>CV</th>
                    <th className={TH}>{t('users.format')}</th>
                    <th className={TH}>{t('users.uploaded')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {detail.resumes.map((resume) => (
                    <tr key={resume.id}>
                      <td className={TD}>
                        <span className="font-medium text-navy-900">
                          {resume.file_name}
                        </span>
                        {resume.is_primary && (
                          <span
                            className="ml-1 inline-flex items-center text-orange-700"
                            aria-label={t('users.primaryCv')}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </span>
                        )}
                      </td>
                      <td className={TD}>
                        {resume.file_name.toLowerCase().endsWith('.pdf')
                          ? 'PDF'
                          : 'TXT'}
                      </td>
                      <td className={TD}>
                        <span className="whitespace-nowrap text-navy-500">
                          {formatDateTime(resume.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="document"
              title="No resumes"
              description="This user has not uploaded any CV."
            />
          )}
        </div>
      </div>

      {/* Role management */}
      <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900">Role management</h2>
        <p className="mt-1 text-sm text-navy-500">
          {isAdmin
            ? 'This user is an administrator.'
            : 'This user is a standard user.'}{' '}
          Promoting is always allowed; demoting is blocked when it would leave
          the platform with no administrator.
        </p>
        <div className="mt-3">
          <RoleToggleForm
            userId={detail.user.id}
            currentRole={detail.user.role}
            disabled={isSelf}
          />
          {isSelf && (
            <p className="mt-2 text-xs text-navy-400">
              You cannot change your own role. Sign in as another admin to edit
              it.
            </p>
          )}
        </div>
      </div>

            {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-red-900">Danger zone</h2>
        <p className="mt-1 text-sm text-red-800/90">
          Deleting this account permanently removes the auth user, every CV
          file, resume analysis and matching log (cascade delete, migrations
          001–006). This action is recorded in the audit log and cannot be
          undone.
        </p>
        <div className="mt-3">
          <DeleteUserButton
            userId={detail.user.id}
            userName={detail.user.full_name}
            disabled={isSelf}
          />
          {isSelf && (
            <p className="mt-2 text-xs text-navy-400">
              You cannot delete your own account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
 
