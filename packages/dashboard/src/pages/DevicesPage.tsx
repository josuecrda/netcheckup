import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Monitor, Radar, Wifi, WifiOff } from 'lucide-react';
import type { DeviceType, DeviceStatus } from '@netcheckup/shared';
import { useDevices } from '../hooks/useDevices';
import { useTriggerDiscovery } from '../hooks/useScans';
import DeviceCard from '../components/devices/DeviceCard';
import DeviceDetail from '../components/devices/DeviceDetail';
import DeviceFilters from '../components/devices/DeviceFilters';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';

export default function DevicesPage() {
  const { data: devices, isLoading } = useDevices();
  const discovery = useTriggerDiscovery();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DeviceType | 'all'>('all');

  const selectedId = searchParams.get('selected');
  const selectedDevice = devices?.find((d) => d.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    if (!devices) return [];
    return devices.filter((d) => {
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
  }, [devices, search, statusFilter, typeFilter]);

  if (isLoading) return <Spinner />;

  return (
    <div className="flex gap-6">
      {/* Device list */}
      <div className={`flex-1 space-y-4 ${selectedDevice ? 'hidden lg:block' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {filtered.length} dispositivo{filtered.length !== 1 ? 's' : ''}
            </h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">{filtered.filter(d => d.status === 'online').length}</span>
                en línea
              </span>
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3 text-gray-500" />
                <span className="text-gray-500 font-medium">{filtered.filter(d => d.status !== 'online').length}</span>
                sin conexión
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Radar className="w-4 h-4" />}
            loading={discovery.isPending}
            onClick={() => discovery.mutate()}
          >
            Escanear
          </Button>
        </div>

        <DeviceFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Monitor className="w-12 h-12" />}
            title="Sin dispositivos"
            description="No se encontraron dispositivos con los filtros aplicados."
          />
        ) : (
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
        )}
      </div>

      {/* Detail panel */}
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
