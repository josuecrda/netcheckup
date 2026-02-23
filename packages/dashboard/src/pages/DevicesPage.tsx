import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Monitor, Radar, Wifi, WifiOff } from 'lucide-react';
import type { Device, DeviceType, DeviceStatus } from '@netcheckup/shared';
import { useDevices } from '../hooks/useDevices';
import { useTriggerDiscovery } from '../hooks/useScans';
import { useScanProgress } from '../hooks/useScanProgress';
import { useToast } from '../components/common/Toast';
import DeviceCard from '../components/devices/DeviceCard';
import DeviceListRow from '../components/devices/DeviceListRow';
import DeviceDetail from '../components/devices/DeviceDetail';
import DeviceFilters from '../components/devices/DeviceFilters';
import type { SortField, SortDir, ViewMode } from '../components/devices/DeviceFilters';
import ScanOverlay from '../components/devices/ScanOverlay';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';

/* ── Sort helpers ── */

const statusOrder: Record<string, number> = { online: 0, degraded: 1, offline: 2 };

function compareDevices(a: Device, b: Device, field: SortField, dir: SortDir): number {
  let cmp = 0;

  switch (field) {
    case 'name': {
      const na = (a.customName || a.hostname || a.ipAddress).toLowerCase();
      const nb = (b.customName || b.hostname || b.ipAddress).toLowerCase();
      cmp = na.localeCompare(nb);
      break;
    }
    case 'ip': {
      // Numeric IP comparison: split by "." and compare each octet
      const pa = a.ipAddress.split('.').map(Number);
      const pb = b.ipAddress.split('.').map(Number);
      for (let i = 0; i < 4; i++) {
        if (pa[i] !== pb[i]) { cmp = pa[i] - pb[i]; break; }
      }
      break;
    }
    case 'status': {
      cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      break;
    }
    case 'latency': {
      const la = a.latencyMs ?? 9999;
      const lb = b.latencyMs ?? 9999;
      cmp = la - lb;
      break;
    }
    case 'lastSeen': {
      cmp = (a.lastSeen || '').localeCompare(b.lastSeen || '');
      break;
    }
    case 'type': {
      cmp = a.deviceType.localeCompare(b.deviceType);
      break;
    }
  }

  return dir === 'asc' ? cmp : -cmp;
}

/* ── Page component ── */

export default function DevicesPage() {
  const { data: devices, isLoading } = useDevices();
  const discovery = useTriggerDiscovery();
  const scanProgress = useScanProgress();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DeviceType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('ip');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const handleDiscovery = () => {
    discovery.mutate(undefined, {
      onError: (err) => addToast({ message: (err as Error).message || 'Error al escanear', type: 'error' }),
    });
  };

  const handleSortChange = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction when clicking same field
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const selectedId = searchParams.get('selected');
  const selectedDevice = devices?.find((d) => d.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    if (!devices) return [];
    const result = devices.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.ipAddress.includes(q) ||
        d.macAddress.toLowerCase().includes(q) ||
        (d.hostname?.toLowerCase().includes(q) ?? false) ||
        (d.customName?.toLowerCase().includes(q) ?? false) ||
        (d.vendor?.toLowerCase().includes(q) ?? false);
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchType = typeFilter === 'all' || d.deviceType === typeFilter;
      return matchSearch && matchStatus && matchType;
    });

    result.sort((a, b) => compareDevices(a, b, sortField, sortDir));
    return result;
  }, [devices, search, statusFilter, typeFilter, sortField, sortDir]);

  if (isLoading) return <Spinner />;

  return (
    <div className="flex gap-6">
      {/* Device list */}
      <div className={`flex-1 min-w-0 space-y-4 ${selectedDevice ? 'hidden lg:block' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {filtered.length} dispositivo{filtered.length !== 1 ? 's' : ''}
            </h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">{filtered.filter(d => d.status === 'online').length}</span>
                en linea
              </span>
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3 text-gray-500" />
                <span className="text-gray-500 font-medium">{filtered.filter(d => d.status !== 'online').length}</span>
                sin conexion
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Radar className="w-4 h-4" />}
            loading={discovery.isPending}
            onClick={handleDiscovery}
          >
            Escanear
          </Button>
        </div>

        {/* Scan progress overlay */}
        <ScanOverlay progress={scanProgress} />

        <DeviceFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          sortField={sortField}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Monitor className="w-12 h-12" />}
            title="Sin dispositivos"
            description="No se encontraron dispositivos con los filtros aplicados."
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {filtered.map((d) => (
              <DeviceCard
                key={d.id}
                device={d}
                selected={d.id === selectedId}
                onClick={() => setSearchParams({ selected: d.id })}
              />
            ))}
          </div>
        ) : (
          /* List view */
          <div className="bg-surface rounded-card border border-white/5 divide-y divide-white/5">
            {/* List header */}
            <div className="flex items-center gap-3 px-3 py-2 text-xs text-gray-500 font-medium">
              <span className="w-[48px] flex-shrink-0" />
              <span className="flex-1 min-w-0">Nombre</span>
              <span className="w-[110px] flex-shrink-0 hidden sm:block">IP</span>
              <span className="w-[130px] flex-shrink-0 hidden xl:block">MAC</span>
              <span className="w-[120px] flex-shrink-0 hidden xl:block">Vendor</span>
              <span className="w-[70px] text-right flex-shrink-0">Estado</span>
              <span className="w-[50px] text-right flex-shrink-0">Ping</span>
            </div>
            {filtered.map((d) => (
              <DeviceListRow
                key={d.id}
                device={d}
                selected={d.id === selectedId}
                onClick={() => setSearchParams({ selected: d.id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel — same layout for both views */}
      {selectedDevice && (
        <div className="w-full lg:w-[400px] flex-shrink-0">
          <DeviceDetail
            device={selectedDevice}
            onClose={() => setSearchParams({})}
          />
        </div>
      )}
    </div>
  );
}
