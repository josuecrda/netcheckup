import { Monitor, Wifi, WifiOff } from 'lucide-react';
import Card from '../common/Card';
import { useDeviceSummary } from '../../hooks/useDevices';

export default function DeviceSummaryCard() {
  const { data, isLoading } = useDeviceSummary();

  if (isLoading) {
    return (
      <Card>
        <div className="h-20 bg-white/5 animate-pulse rounded" />
      </Card>
    );
  }

  const total = data?.total ?? 0;
  const online = data?.online ?? 0;
  const offline = data?.offline ?? 0;

  return (
    <Card>
      <p className="text-sm text-gray-400 mb-3">Dispositivos</p>
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-5 h-5 text-accent" />
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-sm text-gray-500">total</span>
      </div>
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-medium">{online}</span>
          <span className="text-gray-500">en línea</span>
        </div>
        <div className="flex items-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-400 font-medium">{offline}</span>
          <span className="text-gray-500">offline</span>
        </div>
      </div>
    </Card>
  );
}
