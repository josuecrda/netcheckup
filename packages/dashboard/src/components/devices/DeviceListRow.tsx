import type { Device } from '@netcheckup/shared';
import StatusDot from '../common/StatusDot';
import DeviceIcon from '../common/DeviceIcon';

interface DeviceListRowProps {
  device: Device;
  onClick: () => void;
  selected?: boolean;
}

export default function DeviceListRow({ device, onClick, selected }: DeviceListRowProps) {
  const name = device.customName || device.hostname || device.ipAddress;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-all hover:bg-surface-light/50 ${
        selected ? 'bg-accent/10' : ''
      }`}
    >
      {/* Icon + Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <DeviceIcon type={device.deviceType} className="w-4 h-4 text-gray-500" />
        <StatusDot status={device.status} />
      </div>

      {/* Name */}
      <span className="text-sm font-medium text-gray-200 truncate flex-1 min-w-0">
        {name}
      </span>

      {/* IP */}
      <span className="text-xs text-gray-400 tabular-nums w-[110px] flex-shrink-0 hidden sm:block">
        {device.ipAddress}
      </span>

      {/* MAC */}
      <span className="text-xs text-gray-500 font-mono w-[130px] flex-shrink-0 hidden xl:block">
        {device.macAddress}
      </span>

      {/* Vendor */}
      <span className="text-xs text-gray-500 truncate w-[120px] flex-shrink-0 hidden xl:block">
        {device.vendor || '—'}
      </span>

      {/* Status label */}
      <span className={`text-xs font-medium w-[70px] text-right flex-shrink-0 ${
        device.status === 'online'
          ? 'text-emerald-400'
          : device.status === 'degraded'
            ? 'text-amber-400'
            : 'text-gray-500'
      }`}>
        {device.status === 'online' ? 'En linea' : device.status === 'degraded' ? 'Degradado' : 'Offline'}
      </span>

      {/* Latency */}
      <span className={`text-xs tabular-nums w-[50px] text-right flex-shrink-0 ${
        device.latencyMs != null
          ? device.latencyMs > 100 ? 'text-amber-400' : 'text-emerald-400'
          : 'text-gray-600'
      }`}>
        {device.latencyMs != null ? `${device.latencyMs.toFixed(0)}ms` : '—'}
      </span>
    </div>
  );
}
