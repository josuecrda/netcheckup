import { Search } from 'lucide-react';
import type { DeviceType, DeviceStatus } from '@netcheckup/shared';

interface DeviceFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: DeviceStatus | 'all';
  onStatusChange: (v: DeviceStatus | 'all') => void;
  typeFilter: DeviceType | 'all';
  onTypeChange: (v: DeviceType | 'all') => void;
}

const statusOptions: { value: DeviceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'online', label: 'En línea' },
  { value: 'offline', label: 'Offline' },
  { value: 'degraded', label: 'Degradado' },
];

const typeOptions: { value: DeviceType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'router', label: 'Router' },
  { value: 'switch', label: 'Switch' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'server', label: 'Servidor' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'printer', label: 'Impresora' },
  { value: 'access-point', label: 'Access Point' },
  { value: 'iot', label: 'IoT' },
  { value: 'camera', label: 'Cámara' },
  { value: 'unknown', label: 'Desconocido' },
];

export default function DeviceFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
}: DeviceFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar por IP, nombre, MAC..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-surface border border-white/10 rounded-btn pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as DeviceStatus | 'all')}
        className="bg-surface border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent/50"
      >
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value as DeviceType | 'all')}
        className="bg-surface border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent/50"
      >
        {typeOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
