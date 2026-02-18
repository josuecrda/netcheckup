import HealthScoreCard from '../components/dashboard/HealthScoreCard';
import DeviceSummaryCard from '../components/dashboard/DeviceSummaryCard';
import SpeedTestWidget from '../components/dashboard/SpeedTestWidget';
import RecentAlertsCard from '../components/dashboard/RecentAlertsCard';
import QuickActions from '../components/dashboard/QuickActions';
import ProblemsCard from '../components/dashboard/ProblemsCard';
import DeviceListMini from '../components/devices/DeviceListMini';

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Top row: Health + Devices + Speed Test */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <HealthScoreCard />
        <DeviceSummaryCard />
        <SpeedTestWidget />
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Devices list + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DeviceListMini />
        <RecentAlertsCard />
      </div>

      {/* Problems / Diagnostics */}
      <ProblemsCard />
    </div>
  );
}
