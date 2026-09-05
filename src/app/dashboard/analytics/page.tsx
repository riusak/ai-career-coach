import { getDashboardViewData } from '@/lib/dashboard/load-dashboard';
import AnalyticsView from '@/components/dashboard/AnalyticsView';

/**
 * « Analytics » page — template-styled analytics view fed by the shared
 * dashboard loader.
 */
export default async function AnalyticsPage() {
  const { data } = await getDashboardViewData();

  return <AnalyticsView data={data} />;
}