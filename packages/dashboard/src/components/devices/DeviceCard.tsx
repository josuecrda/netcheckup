import type { Device } from '@netcheckup/shared';
import StatusDot from '../common/StatusDot';
import DeviceIcon from '../common/DeviceIcon';
import Badge from '../common/Badge';

interface DeviceCardProps {
  device: Device;
  onClick: () => void;
  selected?: boolean;
}

function statusBadge(status: Device['status']) {
  const map = { online: 'success', offline: 'neutral', degraded: 'warning' } as const;
  const label = { online: 'En línea', offline: 'Offline', degraded: 'Degradado' };
  return <Badge variant={map[status]}>{label[status]}</Badge>;
}

export default function DeviceCard({ device, onClick, selected }: DeviceCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-card border p-4 cursor-pointer transition-all hover:border-accent/30 ${
        selected ? 'border-accent ring-1 ring-accent/20' : 'border-white/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 bg-surface-dark rounded-lg">
          <DeviceIcon type={device.deviceType} className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusDot status={device.status} />
            <span className="text-sm font-medium text-gray-200 truncate">
              {device.customName || device.hostname || device.ipAddress}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-2">{device.ipAddress} · {device.macAddress}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {statusBadge(device.status)}
            {device.vendor && (
              <span className="text-xs text-gray-500 truncate max-w-[140px]">{device.vendor}</span>
            )}
          </div>
        </div>
        {device.latencyMs != null && (
          <div className="text-right">
            <p className={`text-sm font-medium ${device.latencyMs > 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {device.latencyMs.toFixed(0)}ms
            </p>
            {device.packetLoss != null && device.packetLoss > 0 && (
              <p className="text-xs text-red-400">{device.packetLoss.toFixed(0)}% loss</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
