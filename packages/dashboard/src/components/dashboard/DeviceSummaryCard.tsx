import { Monitor, Wifi, WifiOff, ArrowRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import DeviceIcon from '../common/DeviceIcon';
import { useDeviceSummary, useDevices } from '../../hooks/useDevices';

export default function DeviceSummaryCard() {
  const { data, isLoading } = useDeviceSummary();
  const { data: devices } = useDevices();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="h-full">
        <div className="h-20 bg-white/5 animate-pulse rounded" />
      </Card>
    );
  }

  const total = data?.total ?? 0;
  const online = data?.online ?? 0;
  const offline = data?.offline ?? 0;
  const onlinePercent = total > 0 ? Math.round((online / total) * 100) : 0;

  // Top 3 devices by highest latency (most consuming)
  const topDevices = (devices ?? [])
    .filter((d: any) => d.status === 'online' && d.latencyMs != null)
    .sort((a: any, b: any) => (b.latencyMs ?? 0) - (a.latencyMs ?? 0))
    .slice(0, 3);

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">Dispositivos</p>
        <button
          onClick={() => navigate('/devices')}
          className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
        >
          Ver todos <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold">{total}</span>
            <span className="text-sm text-gray-500">total</span>
          </div>
          <div className="flex gap-3 text-xs mt-0.5">
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">{online}</span>
            </span>
            <span className="flex items-center gap-1">
              <WifiOff className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500">{offline}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${onlinePercent}%` }}
          />
        </div>
      </div>

      {/* Top 3 highest latency — flex-1 to fill remaining space */}
      <div className="flex-1 flex flex-col pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Mayor latencia</span>
        </div>
        {topDevices.length > 0 ? (
          <div className="space-y-1.5 flex-1">
            {topDevices.map((d: any) => (
              <div
                key={d.id}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white/5 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                onClick={() => navigate(`/devices?selected=${d.id}`)}
              >
                <DeviceIcon type={d.deviceType} className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-300 truncate flex-1">
                  {d.customName || d.hostname || d.ipAddress}
                </span>
                <span className={`tabular-nums font-medium ${
                  (d.latencyMs ?? 0) > 100 ? 'text-red-400' :
                  (d.latencyMs ?? 0) > 50 ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {d.latencyMs.toFixed(0)}ms
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[10px] text-gray-600">Esperando datos...</p>
          </div>
        )}
      </div>
    </Card>
  );
}
