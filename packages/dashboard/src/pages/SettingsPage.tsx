import { useState, useEffect, useMemo } from 'react';
import { Save, Server, Wifi, Clock, Bell, RotateCcw, Settings } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import PlanCard from '../components/settings/PlanCard';
import { useSettings, useAgentStatus, useUpdateSettings } from '../hooks/useSettings';
import { useToast } from '../components/common/Toast';
import type { AppSettings } from '@netcheckup/shared';

const DEFAULTS: Partial<AppSettings> = {
  scanInterval: 30,
  pingInterval: 60,
  speedTestInterval: 360,
  highLatencyThresholdMs: 100,
  packetLossThresholdPercent: 5,
  speedDegradedPercent: 50,
  alertCooldownMinutes: 30,
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

function InputField({ label, value, onChange, type = 'text', placeholder = '', isDirty = false }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string; isDirty?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {label}
        {isDirty && <span className="text-accent ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-surface-dark border rounded-btn px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors ${
          isDirty ? 'border-accent/30' : 'border-white/10'
        }`}
      />
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: status } = useAgentStatus();
  const updateSettings = useUpdateSettings();
  const { addToast, updateToast } = useToast();

  const [form, setForm] = useState<Partial<AppSettings>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Track dirty fields
  const dirtyFields = useMemo(() => {
    if (!settings) return new Set<string>();
    const dirty = new Set<string>();
    for (const key of Object.keys(form)) {
      const k = key as keyof AppSettings;
      if (form[k] !== settings[k]) dirty.add(key);
    }
    return dirty;
  }, [form, settings]);

  const isDirty = (key: keyof AppSettings) => dirtyFields.has(key);
  const hasChanges = dirtyFields.size > 0;

  const handleSave = () => {
    const id = addToast({ message: 'Guardando configuración...', type: 'loading' });
    updateSettings.mutate(form, {
      onSuccess: () => {
        updateToast(id, { message: 'Configuración guardada', type: 'success' });
      },
      onError: () => {
        updateToast(id, { message: 'Error al guardar configuración', type: 'error' });
      },
    });
  };

  const handleResetDefaults = () => {
    setForm((prev) => ({ ...prev, ...DEFAULTS }));
    addToast({ message: 'Valores restaurados a defaults (recuerda guardar)', type: 'success' });
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-semibold">Configuración</h2>
      </div>

      {/* Agent status */}
      {status && (
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <Server className="w-5 h-5 text-accent" />
            <p className="text-sm font-medium text-gray-300">Estado del Agente</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Versión</span>
              <p className="text-gray-200">{status.version}</p>
            </div>
            <div>
              <span className="text-gray-500">Uptime</span>
              <p className="text-gray-200">{formatUptime(status.uptime)}</p>
            </div>
            <div>
              <span className="text-gray-500">Plataforma</span>
              <p className="text-gray-200">{status.platform}</p>
            </div>
            <div>
              <span className="text-gray-500">Memoria</span>
              <p className="text-gray-200">{formatBytes(status.memoryUsage.rss)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* General */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Wifi className="w-5 h-5 text-accent" />
          <div>
            <p className="text-sm font-medium text-gray-300">General</p>
            <p className="text-xs text-gray-500">Información de tu empresa y proveedor de Internet</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Nombre de la empresa" value={form.companyName ?? ''} onChange={(v) => set('companyName', v)} isDirty={isDirty('companyName')} />
          <InputField label="Proveedor de Internet (ISP)" value={form.ispName ?? ''} onChange={(v) => set('ispName', v)} placeholder="Ej: Telmex" isDirty={isDirty('ispName')} />
          <InputField label="Velocidad contratada descarga (Mbps)" value={form.contractedDownloadMbps ?? ''} onChange={(v) => set('contractedDownloadMbps', v ? Number(v) : null)} type="number" isDirty={isDirty('contractedDownloadMbps')} />
          <InputField label="Velocidad contratada subida (Mbps)" value={form.contractedUploadMbps ?? ''} onChange={(v) => set('contractedUploadMbps', v ? Number(v) : null)} type="number" isDirty={isDirty('contractedUploadMbps')} />
        </div>
      </Card>

      {/* Intervals */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-medium text-gray-300">Intervalos de Escaneo</p>
              <p className="text-xs text-gray-500">Frecuencia con la que el agente ejecuta cada tipo de escaneo</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="Escaneo de red (minutos)" value={form.scanInterval ?? 30} onChange={(v) => set('scanInterval', Number(v))} type="number" isDirty={isDirty('scanInterval')} />
          <InputField label="Ping (segundos)" value={form.pingInterval ?? 60} onChange={(v) => set('pingInterval', Number(v))} type="number" isDirty={isDirty('pingInterval')} />
          <InputField label="Speed Test (minutos)" value={form.speedTestInterval ?? 360} onChange={(v) => set('speedTestInterval', Number(v))} type="number" isDirty={isDirty('speedTestInterval')} />
        </div>
      </Card>

      {/* Alert thresholds */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-accent" />
          <div>
            <p className="text-sm font-medium text-gray-300">Umbrales de Alertas</p>
            <p className="text-xs text-gray-500">Valores a partir de los cuales el sistema genera alertas</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Latencia alta (ms)" value={form.highLatencyThresholdMs ?? 100} onChange={(v) => set('highLatencyThresholdMs', Number(v))} type="number" isDirty={isDirty('highLatencyThresholdMs')} />
          <InputField label="Pérdida de paquetes (%)" value={form.packetLossThresholdPercent ?? 5} onChange={(v) => set('packetLossThresholdPercent', Number(v))} type="number" isDirty={isDirty('packetLossThresholdPercent')} />
          <InputField label="Velocidad degradada (%)" value={form.speedDegradedPercent ?? 50} onChange={(v) => set('speedDegradedPercent', Number(v))} type="number" isDirty={isDirty('speedDegradedPercent')} />
          <InputField label="Cooldown de alertas (minutos)" value={form.alertCooldownMinutes ?? 30} onChange={(v) => set('alertCooldownMinutes', Number(v))} type="number" isDirty={isDirty('alertCooldownMinutes')} />
        </div>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button
          icon={<Save className="w-4 h-4" />}
          loading={updateSettings.isPending}
          onClick={handleSave}
          disabled={!hasChanges}
        >
          Guardar Cambios
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={handleResetDefaults}
        >
          Restaurar defaults
        </Button>
        {hasChanges && (
          <span className="text-xs text-accent">
            {dirtyFields.size} campo{dirtyFields.size !== 1 ? 's' : ''} modificado{dirtyFields.size !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Plan / Licencia */}
      <PlanCard />
    </div>
  );
}
