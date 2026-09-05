import { getDashboardViewData } from '@/lib/dashboard/load-dashboard';
import SettingsView from '@/components/dashboard/SettingsView';

/**
 * « Paramètres » page — template-styled settings view fed by the shared
 * dashboard loader (user card).
 */
export default async function SettingsPage() {
  const { data } = await getDashboardViewData();

  return <SettingsView user={data.user} />;
}