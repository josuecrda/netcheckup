import type { DeviceType } from '@netcheckup/shared';
import {
  Router,
  Network,
  Monitor,
  Laptop,
  Server,
  Printer,
  Smartphone,
  Wifi,
  Home,
  Camera,
  HelpCircle,
  Tablet,
  HardDrive,
} from 'lucide-react';

const iconMap: Record<DeviceType, React.ComponentType<{ className?: string }>> = {
  router: Router,
  switch: Network,
  desktop: Monitor,
  laptop: Laptop,
  server: Server,
  printer: Printer,
  phone: Smartphone,
  tablet: Tablet,
  'access-point': Wifi,
  iot: Home,
  camera: Camera,
  nas: HardDrive,
  unknown: HelpCircle,
};

export default function DeviceIcon({
  type,
  className = 'w-5 h-5',
}: {
  type: DeviceType;
  className?: string;
}) {
  const Icon = iconMap[type] || HelpCircle;
  return <Icon className={className} />;
}
