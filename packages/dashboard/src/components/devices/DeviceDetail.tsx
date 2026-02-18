import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Edit2, Save, Trash2, Shield, Radio, Power } from 'lucide-react';
import type { Device } from '@netcheckup/shared';
import Card from '../common/Card';
import Badge from '../common/Badge';
import StatusDot from '../common/StatusDot';
import DeviceIcon from '../common/DeviceIcon';
import Button from '../common/Button';
import TimeRangeSelector from '../common/TimeRangeSelector';
import LatencyChart from '../charts/LatencyChart';
import { useDeviceMetrics, useUpdateDevice, useDeleteDevice } from '../../hooks/useDevices';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface DeviceDetailProps {
  device: Device;
  onClose: () => void;
}

export default function DeviceDetail({ device, onClose }: DeviceDetailProps) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('24h');
  const [editing, setEditing] = useState(false);
  const [customName, setCustomName] = useState(device.customName || '');
  const { data: metrics } = useDeviceMetrics(device.id, period);
  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();

  const handleSaveName = () => {
    updateDevice.mutate({ id: device.id, data: { customName: customName || null } });
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirm('¿Eliminar este dispositivo?')) {
      deleteDevice.mutate(device.id);
      onClose();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-surface-dark rounded-lg">
              <DeviceIcon type={device.deviceType} className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-accent/50"
                    placeholder="Nombre personalizado"
                  />
                  <button onClick={handleSaveName} className="text-emerald-400 hover:text-emerald-300">
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {device.customName || device.hostname || device.ipAddress}
                  </h2>
                  <button onClick={() => setEditing(true)} className="text-gray-500 hover:text-gray-300">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <StatusDot status={device.status} />
                <span className="text-xs text-gray-400 capitalize">{device.status}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={handleDelete} />
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">IP</span>
            <p className="text-gray-200 font-mono">{device.ipAddress}</p>
          </div>
          <div>
            <span className="text-gray-500">MAC</span>
            <p className="text-gray-200 font-mono text-xs">{device.macAddress}</p>
          </div>
          <div>
            <span className="text-gray-500">Fabricante</span>
            <p className="text-gray-200">{device.vendor || 'Desconocido'}</p>
          </div>
          <div>
            <span className="text-gray-500">Tipo</span>
            <p className="text-gray-200 capitalize">{device.deviceType}</p>
          </div>
          <div>
            <span className="text-gray-500">Visto por primera vez</span>
            <p className="text-gray-200">
              {formatDistanceToNow(new Date(device.firstSeen), { addSuffix: true, locale: es })}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Última vez visto</span>
            <p className="text-gray-200">
              {formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true, locale: es })}
            </p>
          </div>
          {device.latencyMs != null && (
            <div>
              <span className="text-gray-500">Latencia</span>
              <p className={`font-medium ${device.latencyMs > 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {device.latencyMs.toFixed(1)} ms
              </p>
            </div>
          )}
          {device.packetLoss != null && (
            <div>
              <span className="text-gray-500">Pérdida de paquetes</span>
              <p className={`font-medium ${device.packetLoss > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                {device.packetLoss.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {device.isGateway && (
          <Badge variant="info">Gateway</Badge>
        )}

        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/5">
          <Button
            variant="secondary"
            size="sm"
            icon={<Shield className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/tools?tool=ports&host=${device.ipAddress}`)}
          >
            Ver puertos
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Radio className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/tools?tool=ping&host=${device.ipAddress}`)}
          >
            Ping
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Power className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/tools?tool=wol&mac=${device.macAddress}`)}
          >
            WoL
          </Button>
        </div>
      </Card>

      {/* Latency chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-300">Latencia</p>
          <TimeRangeSelector value={period} onChange={setPeriod} />
        </div>
        <LatencyChart data={metrics?.dataPoints ?? []} />
      </Card>
    </div>
  );
}
