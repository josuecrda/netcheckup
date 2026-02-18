import { useState } from 'react';
import { Route } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import DeviceSelector from './DeviceSelector';
import { useTracerouteTool } from '../../hooks/useTools';

interface TracerouteToolProps {
  initialHost?: string;
}

export default function TracerouteTool({ initialHost = '' }: TracerouteToolProps) {
  const [host, setHost] = useState(initialHost);
  const trace = useTracerouteTool();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) return;
    trace.mutate({ host: host.trim() });
  };

  return (
    <Card>
      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <Route className="w-4 h-4 text-accent" />
        Traceroute
      </h3>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <DeviceSelector
          value={host}
          onChange={setHost}
          placeholder="Host o IP (ej: google.com)"
          className="flex-1"
        />
        <Button type="submit" loading={trace.isPending} size="md">
          Trazar ruta
        </Button>
      </form>

      {trace.isPending && (
        <p className="text-sm text-gray-400 animate-pulse">Trazando ruta... esto puede tomar hasta 60 segundos</p>
      )}

      {trace.data && trace.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-xs">
                <th className="text-left px-3 py-2 font-medium">Salto</th>
                <th className="text-left px-3 py-2 font-medium">IP</th>
                <th className="text-right px-3 py-2 font-medium">RTT 1</th>
                <th className="text-right px-3 py-2 font-medium">RTT 2</th>
                <th className="text-right px-3 py-2 font-medium">RTT 3</th>
              </tr>
            </thead>
            <tbody>
              {trace.data.map((hop) => (
                <tr key={hop.hop} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2 text-gray-400 font-mono">{hop.hop}</td>
                  <td className="px-3 py-2 text-gray-200 font-mono">{hop.ip || '*'}</td>
                  <td className={`text-right px-3 py-2 font-mono ${rttColor(hop.rtt1)}`}>
                    {hop.rtt1 !== null ? `${hop.rtt1} ms` : '*'}
                  </td>
                  <td className={`text-right px-3 py-2 font-mono ${rttColor(hop.rtt2)}`}>
                    {hop.rtt2 !== null ? `${hop.rtt2} ms` : '*'}
                  </td>
                  <td className={`text-right px-3 py-2 font-mono ${rttColor(hop.rtt3)}`}>
                    {hop.rtt3 !== null ? `${hop.rtt3} ms` : '*'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {trace.error && (
        <p className="text-sm text-red-400">Error: {(trace.error as Error).message}</p>
      )}
    </Card>
  );
}

function rttColor(rtt: number | null): string {
  if (rtt === null) return 'text-gray-600';
  if (rtt < 20) return 'text-emerald-400';
  if (rtt < 100) return 'text-amber-400';
  return 'text-red-400';
}
