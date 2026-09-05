import { redirect } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { getDashboardViewData } from '@/lib/dashboard/load-dashboard';

/**
 * « Career Dashboard » layout — server shell. Loads the shared dashboard view
 * model (memoized with React cache so the page does not refetch) and hands
 * the template-style user card to the client shell (sidebar + header).
 */
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile, data } = await getDashboardViewData();

  // Admins are redirected to their dedicated back-office.
  if (profile?.role === 'admin') {
    redirect('/admin');
  }

  return <DashboardShell user={data.user}>{children}</DashboardShell>;
}