import { ArrowDown, ArrowUp, Timer } from 'lucide-react';
import Card from '../common/Card';
import { useLatestSpeedTest } from '../../hooks/useSpeedTest';

export default function SpeedTestWidget() {
  const { data, isLoading } = useLatestSpeedTest();

  if (isLoading) {
    return (
      <Card>
        <div className="h-20 bg-white/5 animate-pulse rounded" />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <p className="text-sm text-gray-400 mb-2">Speed Test</p>
        <p className="text-gray-500 text-sm">Sin datos aún</p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm text-gray-400 mb-3">Último Speed Test</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
            <ArrowDown className="w-3 h-3" /> Descarga
          </div>
          <span className="text-lg font-bold text-emerald-400">
            {data.downloadMbps.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500 ml-1">Mbps</span>
        </div>
        <div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
            <ArrowUp className="w-3 h-3" /> Subida
          </div>
          <span className="text-lg font-bold text-blue-400">
            {data.uploadMbps.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500 ml-1">Mbps</span>
        </div>
        <div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
            <Timer className="w-3 h-3" /> Ping
          </div>
          <span className="text-lg font-bold text-amber-400">
            {data.pingMs.toFixed(0)}
          </span>
          <span className="text-xs text-gray-500 ml-1">ms</span>
        </div>
      </div>
    </Card>
  );
}
