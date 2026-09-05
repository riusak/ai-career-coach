import FullRoadmapView from '@/components/dashboard/FullRoadmapView';
import { getDashboardViewData } from '@/lib/dashboard/load-dashboard';

/**
 * « Roadmap Carrière » — immersive full roadmap page (template
 * FullRoadmapView). Data comes from the shared memoized dashboard loader.
 */
export default async function TimelinePage() {
  const { data, certificationsCount } = await getDashboardViewData();

  return (
    <FullRoadmapView
      milestones={data.milestones}
      totalYearsExp={data.totalYearsExp}
      certificationsCount={certificationsCount}
    />
  );
}