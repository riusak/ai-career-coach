import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import RoleBadge from '@/components/admin/RoleBadge';
import RoleToggleForm from '@/components/admin/RoleToggleForm';
import DeleteUserButton from '@/components/admin/DeleteUserButton';
import { formatDateTime } from '@/lib/admin/utils';
import type { AdminUser } from '@/types/admin';

interface UsersTableProps {
  users: AdminUser[];
  /** ID of the viewing admin, to disable self-promotion / self-deletion. */
  currentAdminId: string | null;
}

const TH =
  'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-navy-500';
const TD = 'px-4 py-2.5 align-top text-sm text-navy-900';

/**
 * Clean "Light & Gold" table of registered users. Actions are wired through
 * guarded server actions + service-role data layer — never trust the client.
 */
export default async function UsersTable({ users, currentAdminId }: UsersTableProps) {
  const t = await getTranslations('admin');
  if (users.length === 0) {
    return null;
  }

  return (
    <div className="-mx-1 overflow-x-auto rounded-xl border border-navy-100 bg-white">
      <table className="w-full text-left align-top">
        <thead className="bg-navy-50">
          <tr>
            <th className={TH}>{t('users.user')}</th>
            <th className={TH}>{t('users.role')}</th>
            <th className={TH}>{t('users.content')}</th>
            <th className={TH}>{t('users.created')}</th>
            <th className={TH}>{t('users.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {users.map((user) => {
            const isSelf = user.id === currentAdminId;
            return (
              <tr key={user.id} className="align-top">
                <td className={TD}>
                  <div className="font-medium text-navy-900">
                    {user.full_name || t('users.unnamed')}
                  </div>
                  {user.email ? (
                    <div className="text-navy-500">{user.email}</div>
                  ) : (
                    <span className="text-xs text-navy-400">{t('users.noEmail')}</span>
                  )}
                  <div className="mt-1 text-xs text-navy-400">
                    {t('users.idLabel')}: <span className="font-mono">{user.id.slice(0, 8)}…</span>
                  </div>
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={user.role} label={t(`roles.${user.role}`)} />
                    <RoleToggleForm
                      userId={user.id}
                      currentRole={user.role}
                      disabled={isSelf}
                    />
                  </div>
                </td>
                <td className={TD}>
                  <div className="text-navy-600">
                    {t('users.resumesCount', { count: user.resume_count })} ·{' '}
                    {t('users.analysesCount', { count: user.analysis_count })}
                  </div>
                </td>
                <td className={TD}>
                  <span className="whitespace-nowrap text-navy-500">
                    {formatDateTime(user.created_at)}
                  </span>
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-xs font-medium text-orange-700 hover:text-orange-800"
                    >
                      {t('users.view')}
                    </Link>
                    <DeleteUserButton
                      userId={user.id}
                      userName={user.full_name}
                      disabled={isSelf}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
