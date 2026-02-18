import { Bell, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import Card from '../common/Card';
import { useAlerts } from '../../hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ProblemSeverity } from '@netcheckup/shared';

const severityIcon: Record<ProblemSeverity, React.ReactNode> = {
  critical: <AlertOctagon className="w-4 h-4 text-red-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
};

export default function RecentAlertsCard() {
  const { data } = useAlerts(1, 5);

  const alerts = data?.data ?? [];

  return (
    <Card padding={false}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <p className="text-sm text-gray-400">Alertas Recientes</p>
        <Bell className="w-4 h-4 text-gray-500" />
      </div>
      {alerts.length === 0 ? (
        <p className="text-gray-500 text-sm px-5 pb-4">Sin alertas recientes</p>
      ) : (
        <div className="divide-y divide-white/5">
          {alerts.map((alert) => (
            <div key={alert.id} className="px-5 py-2.5 flex items-start gap-3">
              {severityIcon[alert.severity]}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">{alert.title}</p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
