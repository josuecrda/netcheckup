import { useState } from 'react';
import { Radio } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import DeviceSelector from './DeviceSelector';
import { usePingTool } from '../../hooks/useTools';

interface PingToolProps {
  initialHost?: string;
}

export default function PingTool({ initialHost = '' }: PingToolProps) {
  const [host, setHost] = useState(initialHost);
  const [count, setCount] = useState(4);
  const ping = usePingTool();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) return;
    ping.mutate({ host: host.trim(), count });
  };

  return (
    <Card>
      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <Radio className="w-4 h-4 text-accent" />
        Ping
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
        <DeviceSelector
          value={host}
          onChange={setHost}
          placeholder="Host o IP (ej: google.com)"
          className="flex-1 min-w-[200px]"
        />
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="bg-surface-light border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent"
        >
          <option value={4}>4 paquetes</option>
          <option value={8}>8 paquetes</option>
          <option value={12}>12 paquetes</option>
          <option value={20}>20 paquetes</option>
        </select>
        <Button type="submit" loading={ping.isPending} size="md">
          Ping
        </Button>
      </form>

      {ping.data && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Estado" value={ping.data.alive ? 'Online' : 'Offline'} color={ping.data.alive ? 'text-emerald-400' : 'text-red-400'} />
            <Stat label="Promedio" value={ping.data.avg > 0 ? `${ping.data.avg} ms` : '—'} />
            <Stat label="Mín / Máx" value={ping.data.min > 0 ? `${ping.data.min} / ${ping.data.max} ms` : '—'} />
            <Stat label="Pérdida" value={`${ping.data.packetLoss}%`} color={ping.data.packetLoss > 0 ? 'text-amber-400' : 'text-emerald-400'} />
          </div>
          <pre className="text-xs text-gray-500 bg-black/30 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap">
            {ping.data.output}
          </pre>
        </div>
      )}

      {ping.error && (
        <p className="text-sm text-red-400">Error: {(ping.error as Error).message}</p>
      )}
    </Card>
  );
}

function Stat({ label, value, color = 'text-gray-200' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-black/20 rounded-lg p-2.5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-medium ${color}`}>{value}</p>
    </div>
  );
}
