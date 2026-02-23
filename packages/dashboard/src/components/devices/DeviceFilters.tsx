import { Search, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import type { DeviceType, DeviceStatus } from '@netcheckup/shared';

export type SortField = 'name' | 'ip' | 'status' | 'latency' | 'lastSeen' | 'type';
export type SortDir = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

interface DeviceFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: DeviceStatus | 'all';
  onStatusChange: (v: DeviceStatus | 'all') => void;
  typeFilter: DeviceType | 'all';
  onTypeChange: (v: DeviceType | 'all') => void;
  sortField: SortField;
  sortDir: SortDir;
  onSortChange: (field: SortField) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const statusOptions: { value: DeviceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'online', label: 'En linea' },
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
  { value: 'phone', label: 'Telefono' },
  { value: 'printer', label: 'Impresora' },
  { value: 'access-point', label: 'Access Point' },
  { value: 'iot', label: 'IoT' },
  { value: 'camera', label: 'Camara' },
  { value: 'unknown', label: 'Desconocido' },
];

const sortOptions: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Nombre' },
  { value: 'ip', label: 'IP' },
  { value: 'status', label: 'Estado' },
  { value: 'latency', label: 'Latencia' },
  { value: 'lastSeen', label: 'Visto' },
  { value: 'type', label: 'Tipo' },
];

export default function DeviceFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  sortField,
  sortDir,
  onSortChange,
  viewMode,
  onViewModeChange,
}: DeviceFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Row 1: Search + View toggle */}
      <div className="flex gap-3">
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

        {/* View mode toggle */}
        <div className="flex bg-surface border border-white/10 rounded-btn overflow-hidden flex-shrink-0">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 transition-colors ${
              viewMode === 'grid'
                ? 'bg-accent/20 text-accent'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Vista cuadricula"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 transition-colors ${
              viewMode === 'list'
                ? 'bg-accent/20 text-accent'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Vista lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Filters + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
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

        {/* Sort control */}
        <div className="flex items-center gap-1 ml-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <select
            value={sortField}
            onChange={(e) => onSortChange(e.target.value as SortField)}
            className="bg-surface border border-white/10 rounded-btn px-2 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent/50"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => onSortChange(sortField)}
            className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
            title={sortDir === 'asc' ? 'Ascendente' : 'Descendente'}
          >
            <span className="text-xs font-medium">{sortDir === 'asc' ? 'A-Z' : 'Z-A'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
