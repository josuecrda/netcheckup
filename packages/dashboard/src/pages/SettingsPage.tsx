import { useState, useEffect } from 'react';
import { Save, Server, Wifi, Clock, Bell } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import PlanCard from '../components/settings/PlanCard';
import { useSettings, useAgentStatus, useUpdateSettings } from '../hooks/useSettings';
import type { AppSettings } from '@netcheckup/shared';

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

function InputField({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-dark border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: status } = useAgentStatus();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<Partial<AppSettings>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    updateSettings.mutate(form, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
    });
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-3xl">
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
          <p className="text-sm font-medium text-gray-300">General</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Nombre de la empresa" value={form.companyName ?? ''} onChange={(v) => set('companyName', v)} />
          <InputField label="Proveedor de Internet (ISP)" value={form.ispName ?? ''} onChange={(v) => set('ispName', v)} placeholder="Ej: Telmex" />
          <InputField label="Velocidad contratada descarga (Mbps)" value={form.contractedDownloadMbps ?? ''} onChange={(v) => set('contractedDownloadMbps', v ? Number(v) : null)} type="number" />
          <InputField label="Velocidad contratada subida (Mbps)" value={form.contractedUploadMbps ?? ''} onChange={(v) => set('contractedUploadMbps', v ? Number(v) : null)} type="number" />
        </div>
      </Card>

      {/* Intervals */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-accent" />
          <p className="text-sm font-medium text-gray-300">Intervalos de Escaneo</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="Escaneo de red (minutos)" value={form.scanInterval ?? 30} onChange={(v) => set('scanInterval', Number(v))} type="number" />
          <InputField label="Ping (segundos)" value={form.pingInterval ?? 60} onChange={(v) => set('pingInterval', Number(v))} type="number" />
          <InputField label="Speed Test (minutos)" value={form.speedTestInterval ?? 360} onChange={(v) => set('speedTestInterval', Number(v))} type="number" />
        </div>
      </Card>

      {/* Alert thresholds */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-accent" />
          <p className="text-sm font-medium text-gray-300">Umbrales de Alertas</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Latencia alta (ms)" value={form.highLatencyThresholdMs ?? 100} onChange={(v) => set('highLatencyThresholdMs', Number(v))} type="number" />
          <InputField label="Pérdida de paquetes (%)" value={form.packetLossThresholdPercent ?? 5} onChange={(v) => set('packetLossThresholdPercent', Number(v))} type="number" />
          <InputField label="Velocidad degradada (%)" value={form.speedDegradedPercent ?? 50} onChange={(v) => set('speedDegradedPercent', Number(v))} type="number" />
          <InputField label="Cooldown de alertas (minutos)" value={form.alertCooldownMinutes ?? 30} onChange={(v) => set('alertCooldownMinutes', Number(v))} type="number" />
        </div>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          icon={<Save className="w-4 h-4" />}
          loading={updateSettings.isPending}
          onClick={handleSave}
        >
          Guardar Cambios
        </Button>
        {saved && <span className="text-sm text-emerald-400">Guardado correctamente</span>}
      </div>

      {/* Plan / Licencia */}
      <PlanCard />
    </div>
  );
}
