import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Edit2, Save, Trash2, Shield, Radio, Power, StickyNote, ChevronDown, Check } from 'lucide-react';
import type { Device, DeviceType } from '@netcheckup/shared';
import Card from '../common/Card';
import Badge from '../common/Badge';
import StatusDot from '../common/StatusDot';
import DeviceIcon from '../common/DeviceIcon';
import Button from '../common/Button';
import TimeRangeSelector from '../common/TimeRangeSelector';
import LatencyChart from '../charts/LatencyChart';
import { useDeviceMetrics, useUpdateDevice, useDeleteDevice } from '../../hooks/useDevices';
import { useToast } from '../common/Toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Device types for manual override ───────────────────────
const DEVICE_TYPES: { value: DeviceType; label: string }[] = [
  { value: 'router', label: 'Router' },
  { value: 'switch', label: 'Switch' },
  { value: 'access-point', label: 'Access Point' },
  { value: 'server', label: 'Servidor' },
  { value: 'desktop', label: 'Escritorio' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'printer', label: 'Impresora' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'iot', label: 'IoT / Smart Home' },
  { value: 'camera', label: 'Cámara' },
  { value: 'nas', label: 'NAS' },
  { value: 'unknown', label: 'Desconocido' },
];

interface DeviceDetailProps {
  device: Device;
  onClose: () => void;
}

export default function DeviceDetail({ device, onClose }: DeviceDetailProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [period, setPeriod] = useState('24h');

  // ─── Custom name editing ────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [customName, setCustomName] = useState(device.customName || '');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ─── Notes editing ──────────────────────────────────────
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(device.notes || '');
  const notesInputRef = useRef<HTMLTextAreaElement>(null);

  // ─── Device type override ───────────────────────────────
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  const { data: metrics } = useDeviceMetrics(device.id, period);
  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();

  // Auto-focus inputs when editing starts
  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    if (editingNotes) notesInputRef.current?.focus();
  }, [editingNotes]);

  // Close type menu on click outside
  useEffect(() => {
    if (!showTypeMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTypeMenu]);

  // Sync state when device changes
  useEffect(() => {
    setCustomName(device.customName || '');
    setNotes(device.notes || '');
  }, [device.customName, device.notes]);

  // ─── Handlers ─────────────────────────────────────────────

  const handleSaveName = () => {
    const trimmed = customName.trim();
    updateDevice.mutate(
      { id: device.id, data: { customName: trimmed || null } },
      {
        onSuccess: () => addToast({ message: trimmed ? 'Nombre guardado' : 'Nombre eliminado', type: 'success' }),
        onError: () => addToast({ message: 'Error al guardar nombre', type: 'error' }),
      }
    );
    setEditingName(false);
  };

  const handleSaveNotes = () => {
    const trimmed = notes.trim();
    updateDevice.mutate(
      { id: device.id, data: { notes: trimmed || null } },
      {
        onSuccess: () => addToast({ message: 'Notas guardadas', type: 'success' }),
        onError: () => addToast({ message: 'Error al guardar notas', type: 'error' }),
      }
    );
    setEditingNotes(false);
  };

  const handleChangeType = (newType: DeviceType) => {
    setShowTypeMenu(false);
    if (newType === device.deviceType) return;
    updateDevice.mutate(
      { id: device.id, data: { deviceType: newType } },
      {
        onSuccess: () => addToast({ message: `Tipo cambiado a ${DEVICE_TYPES.find((t) => t.value === newType)?.label}`, type: 'success' }),
        onError: () => addToast({ message: 'Error al cambiar tipo', type: 'error' }),
      }
    );
  };

  const handleDelete = () => {
    if (confirm('¿Eliminar este dispositivo?')) {
      deleteDevice.mutate(device.id, {
        onSuccess: () => addToast({ message: 'Dispositivo eliminado', type: 'success' }),
      });
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, saveHandler: () => void, cancelHandler: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveHandler();
    } else if (e.key === 'Escape') {
      cancelHandler();
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
              {/* ─── Custom Name Editing ────────────────────── */}
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleSaveName, () => { setEditingName(false); setCustomName(device.customName || ''); })}
                    className="bg-surface-dark border border-white/10 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-accent/50 w-48"
                    placeholder="Nombre personalizado"
                  />
                  <button onClick={handleSaveName} className="text-emerald-400 hover:text-emerald-300" title="Guardar (Enter)">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditingName(false); setCustomName(device.customName || ''); }} className="text-gray-500 hover:text-gray-300" title="Cancelar (Esc)">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {device.customName || device.hostname || device.ipAddress}
                  </h2>
                  <button onClick={() => setEditingName(true)} className="text-gray-500 hover:text-gray-300" title="Editar nombre">
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

          {/* ─── Device Type Override ────────────────────── */}
          <div className="relative" ref={typeMenuRef}>
            <span className="text-gray-500">Tipo</span>
            <button
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              className="flex items-center gap-1.5 text-gray-200 capitalize hover:text-accent transition-colors group"
            >
              <DeviceIcon type={device.deviceType} className="w-3.5 h-3.5 text-gray-400 group-hover:text-accent" />
              {DEVICE_TYPES.find((t) => t.value === device.deviceType)?.label || device.deviceType}
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>

            {showTypeMenu && (
              <div className="absolute z-20 top-full left-0 mt-1 w-48 bg-surface border border-white/10 rounded-lg shadow-xl shadow-black/40 py-1 max-h-60 overflow-y-auto">
                {DEVICE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => handleChangeType(t.value)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/5 transition-colors
                      ${device.deviceType === t.value ? 'text-accent' : 'text-gray-300'}`}
                  >
                    <DeviceIcon type={t.value} className="w-3.5 h-3.5" />
                    {t.label}
                    {device.deviceType === t.value && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
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
          <div className="mt-2">
            <Badge variant="info">Gateway</Badge>
          </div>
        )}

        {/* ─── Notes Section ────────────────────────────── */}
        <div className="mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <StickyNote className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</span>
            {!editingNotes && (
              <button onClick={() => setEditingNotes(true)} className="text-gray-500 hover:text-gray-300 ml-auto" title="Editar notas">
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                ref={notesInputRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingNotes(false);
                    setNotes(device.notes || '');
                  }
                }}
                rows={3}
                className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent/50 resize-none placeholder:text-gray-600"
                placeholder="Agregar notas sobre este dispositivo..."
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setEditingNotes(false); setNotes(device.notes || ''); }}
                  className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="text-xs text-accent hover:text-accent/80 font-medium px-2 py-1"
                >
                  Guardar notas
                </button>
              </div>
            </div>
          ) : (
            <p
              className={`text-sm cursor-pointer rounded px-1 -mx-1 py-0.5 hover:bg-white/5 transition-colors ${
                device.notes ? 'text-gray-300' : 'text-gray-600 italic'
              }`}
              onClick={() => setEditingNotes(true)}
            >
              {device.notes || 'Sin notas — click para agregar'}
            </p>
          )}
        </div>

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
