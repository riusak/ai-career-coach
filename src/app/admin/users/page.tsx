import Link from 'next/link';
import UsersTable from '@/components/admin/UsersTable';
import Pagination from '@/components/admin/Pagination';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { listAdminUsers } from '@/lib/admin/users';
import { getCurrentAdmin } from '@/lib/admin/guard';
import {
  buildUsersQuery,
  parsePositiveInt,
  parseRoleFilter,
} from '@/lib/admin/utils';

export const metadata = {
  title: 'Users — Admin Dashboard | ForPro AI',
  description: 'Registered users management.',
};

const PAGE_SIZE = 20;

interface AdminUsersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const admin = await getCurrentAdmin();

  // The layout guarantees admin access; this is defensive (self-contained) only.
  if (!admin.ok) {
    return (
      <ErrorState
        title="Access denied"
        description="Only administrators can manage users."
      />
    );
  }

  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : null;
  const role = parseRoleFilter(typeof sp.role === 'string' ? sp.role : undefined);
  const page = parsePositiveInt(
    typeof sp.page === 'string' ? sp.page : undefined,
    1,
    10000
  );

  const list = await listAdminUsers({ query: q, role, page, pageSize: PAGE_SIZE });

  if (list === null) {
    return (
      <ErrorState
        title="Unable to load users"
        description="The user directory could not be read. Try again in a moment."
      >
        <Link
          href="/admin/users"
          className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
        >
          Retry
        </Link>
      </ErrorState>
    );
  }

  const displayedPage = list.page;
  const buildHref = (nextPage: number) =>
    `/admin/users?${buildUsersQuery(q, role)}&page=${nextPage}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            Registered users
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            {list.total} account{list.total === 1 ? '' : 's'} registered
            (showing {list.users.length} on this page).
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-800"
        >
          ← Overview
        </Link>
      </div>

      {/* Filters (native GET form → server-side, no JS required) */}
      <form action="/admin/users" method="get" className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by full name…"
            className="block w-full rounded-md border border-navy-200 bg-white pl-3 pr-9 py-2 text-sm text-navy-900 placeholder:text-navy-400 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600"
          />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-navy-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx={11} cy={11} r={7} />
            <line x1={15} y1={15} x2={20} y2={20} strokeLinecap="round" />
          </svg>
        </div>
        <select
          name="role"
          defaultValue={(role ?? '') as string}
          className="block w-full min-w-[140px] rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 sm:w-auto"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600"
        >
          Apply
        </button>
        {q || role ? (
          <Link
            href="/admin/users"
            className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-700 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-800"
          >
            Reset
          </Link>
        ) : null}
      </form>

      {/* Table */}
      {list.users.length === 0 ? (
        <EmptyState
          title="No users found"
          description={
            q || role
              ? 'Try adjusting the search or role filter.'
              : 'There are no registered users yet.'
          }
          icon="users"
        />
      ) : (
        <UsersTable users={list.users} currentAdminId={admin.userId} />
      )}

      <Pagination
        page={displayedPage}
        totalPages={list.totalPages}
        totalItems={list.total}
        buildHref={buildHref}
      />
    </div>
  );
}
