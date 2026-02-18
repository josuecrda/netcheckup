import type { DeviceStatus } from '@netcheckup/shared';

const colors: Record<DeviceStatus, string> = {
  online: 'bg-emerald-400',
  offline: 'bg-gray-500',
  degraded: 'bg-amber-400',
};

export default function StatusDot({ status }: { status: DeviceStatus }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'online' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status]}`} />
    </span>
  );
}
