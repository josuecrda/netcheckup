import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, ArrowUpDown, Loader2, Wifi } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import DeviceSelector from './DeviceSelector';
import { snmpApi, devicesApi } from '../../lib/api';
import type { PortCounterDelta } from '@netcheckup/shared';

type SortField = 'name' | 'utilization' | 'errors' | 'speed';

function formatBps(bps: number): string {
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
  return `${bps.toFixed(0)} bps`;
}

function UtilizationBar({ percent, label }: { percent: number; label: string }) {
  const capped = Math.min(percent, 100);
  const color =
    capped > 95
      ? 'bg-red-500'
      : capped > 80
      ? 'bg-amber-500'
      : capped > 50
      ? 'bg-yellow-500'
      : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-6 text-right">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${capped}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-12 text-right">
        {percent.toFixed(0)}%
      </span>
    </div>
  );
}

function PortCard({ delta }: { delta: PortCounterDelta }) {
  const totalErrors =
    delta.inErrorsPerSec +
    delta.outErrorsPerSec +
    delta.fcsErrorsPerSec;
  const totalDiscards =
    delta.inDiscardsPerSec + delta.outDiscardsPerSec;
  const hasIssues = totalErrors > 0 || totalDiscards > 1 || delta.duplexStatus === 'half';

  const portLabel = delta.ifAlias
    ? `${delta.ifName} — ${delta.ifAlias}`
    : delta.ifName;

  return (
    <div
      className={`bg-surface-light rounded-lg border p-3 space-y-2 ${
        hasIssues ? 'border-amber-500/30' : 'border-white/5'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              delta.operStatus === 'up' ? 'bg-emerald-400' : 'bg-gray-500'
            }`}
          />
          <span className="text-sm font-medium text-gray-200 truncate max-w-[200px]">
            {portLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasIssues && (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          )}
          <Badge variant={delta.operStatus === 'up' ? 'success' : 'neutral'}>
            {delta.operStatus}
          </Badge>
        </div>
      </div>

      {/* Speed + Duplex */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{delta.speedMbps >= 1000 ? `${delta.speedMbps / 1000}G` : `${delta.speedMbps}M`}</span>
        <Badge
          variant={
            delta.duplexStatus === 'full'
              ? 'info'
              : delta.duplexStatus === 'half'
              ? 'warning'
              : 'neutral'
          }
        >
          {delta.duplexStatus}
        </Badge>
        {delta.lateCollisionsPerSec > 0 && (
          <Badge variant="danger">late collisions</Badge>
        )}
      </div>

      {/* Utilization bars */}
      <div className="space-y-1">
        <UtilizationBar percent={delta.inUtilizationPercent} label="IN" />
        <UtilizationBar percent={delta.outUtilizationPercent} label="OUT" />
      </div>

      {/* Throughput */}
      <div className="flex justify-between text-[11px] text-gray-500">
        <span>↓ {formatBps(delta.inBitsPerSec)}</span>
        <span>↑ {formatBps(delta.outBitsPerSec)}</span>
      </div>

      {/* Issues */}
      {(totalErrors > 0 || totalDiscards > 1) && (
        <div className="text-[11px] text-amber-400 space-y-0.5">
          {delta.inErrorsPerSec + delta.outErrorsPerSec > 0 && (
            <div>⚠ Errores: {(delta.inErrorsPerSec + delta.outErrorsPerSec).toFixed(1)}/seg</div>
          )}
          {delta.fcsErrorsPerSec > 0 && (
            <div>⚠ CRC/FCS: {delta.fcsErrorsPerSec.toFixed(1)}/seg</div>
          )}
          {totalDiscards > 1 && (
            <div>⚠ Descartes: {totalDiscards.toFixed(1)}/seg</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PortHealthTool() {
  const [deviceId, setDeviceId] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('utilization');
  const [showTopTalkers, setShowTopTalkers] = useState(false);

  // Query devices for selector (filter to switch/router/ap)
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => devicesApi.list(),
  });

  const snmpDevices = (devices || []).filter((d) =>
    ['switch', 'router', 'access-point'].includes(d.deviceType)
  );

  // Query port health for selected device
  const {
    data: portData,
    isLoading: loadingPorts,
    error: portError,
  } = useQuery({
    queryKey: ['snmp-port-health', deviceId],
    queryFn: () => snmpApi.portHealth(deviceId),
    enabled: !!deviceId && !showTopTalkers,
    refetchInterval: 60_000, // Actualizar cada minuto
  });

  // Query top talkers
  const {
    data: topTalkersData,
    isLoading: loadingTopTalkers,
  } = useQuery({
    queryKey: ['snmp-top-talkers'],
    queryFn: () => snmpApi.topTalkers(20),
    enabled: showTopTalkers,
    refetchInterval: 60_000,
  });

  const activeData = showTopTalkers ? topTalkersData : portData;
  const isLoading = showTopTalkers ? loadingTopTalkers : loadingPorts;

  // Sort data
  const sortedData = [...(activeData || [])].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.ifName.localeCompare(b.ifName);
      case 'utilization':
        return (
          Math.max(b.inUtilizationPercent, b.outUtilizationPercent) -
          Math.max(a.inUtilizationPercent, a.outUtilizationPercent)
        );
      case 'errors':
        return (
          b.inErrorsPerSec +
          b.outErrorsPerSec +
          b.fcsErrorsPerSec -
          (a.inErrorsPerSec + a.outErrorsPerSec + a.fcsErrorsPerSec)
        );
      case 'speed':
        return b.speedMbps - a.speedMbps;
      default:
        return 0;
    }
  });

  // Stats
  const upPorts = sortedData.filter((d) => d.operStatus === 'up').length;
  const portsWithErrors = sortedData.filter(
    (d) => d.inErrorsPerSec + d.outErrorsPerSec + d.fcsErrorsPerSec > 0
  ).length;
  const saturatedPorts = sortedData.filter(
    (d) =>
      Math.max(d.inUtilizationPercent, d.outUtilizationPercent) > 80
  ).length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowTopTalkers(false)}
              className={`px-3 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                !showTopTalkers
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'bg-surface-light text-gray-400 hover:text-gray-200 border border-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5 inline mr-1" />
              Por Switch
            </button>
            <button
              onClick={() => setShowTopTalkers(true)}
              className={`px-3 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                showTopTalkers
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'bg-surface-light text-gray-400 hover:text-gray-200 border border-white/5'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 inline mr-1" />
              Top Talkers
            </button>
          </div>

          {/* Device selector (only in "Por Switch" mode) */}
          {!showTopTalkers && (
            <div className="flex-1">
              {snmpDevices.length > 0 ? (
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full bg-surface-light border border-white/10 rounded-btn px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent/50"
                >
                  <option value="">Selecciona un switch/router...</option>
                  {snmpDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.customName || d.hostname || d.ipAddress} ({d.deviceType})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-gray-500 py-1.5">
                  No hay switches/routers detectados en la red
                </div>
              )}
            </div>
          )}

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="bg-surface-light border border-white/10 rounded-btn px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-accent/50"
          >
            <option value="utilization">Ordenar: Utilización</option>
            <option value="errors">Ordenar: Errores</option>
            <option value="speed">Ordenar: Velocidad</option>
            <option value="name">Ordenar: Nombre</option>
          </select>
        </div>
      </Card>

      {/* Stats bar */}
      {sortedData.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-gray-400">{upPorts} puertos activos</span>
          </div>
          {portsWithErrors > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400">{portsWithErrors} con errores</span>
            </div>
          )}
          {saturatedPorts > 0 && (
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400">{saturatedPorts} saturados</span>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
          <span className="ml-2 text-sm text-gray-400">Consultando puertos SNMP...</span>
        </div>
      )}

      {/* Error */}
      {portError && (
        <Card>
          <p className="text-sm text-red-400">
            Error: {(portError as Error).message}
          </p>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !portError && sortedData.length === 0 && (deviceId || showTopTalkers) && (
        <Card>
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              {showTopTalkers
                ? 'No hay datos de tráfico SNMP aún. Espera al siguiente ciclo de polling (cada 5 min).'
                : 'No hay datos de puertos para este dispositivo. Verifica que responda a SNMP.'}
            </p>
          </div>
        </Card>
      )}

      {/* Port grid */}
      {sortedData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedData.map((delta) => (
            <PortCard
              key={`${delta.deviceId}-${delta.ifIndex}`}
              delta={delta}
            />
          ))}
        </div>
      )}
    </div>
  );
}
