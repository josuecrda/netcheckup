import { useState } from 'react';
import { Shield } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import DeviceSelector from './DeviceSelector';
import { usePortScanTool } from '../../hooks/useTools';

interface PortScanToolProps {
  initialHost?: string;
}

export default function PortScanTool({ initialHost = '' }: PortScanToolProps) {
  const [host, setHost] = useState(initialHost);
  const [mode, setMode] = useState<'common' | 'custom' | 'range'>('common');
  const [customPorts, setCustomPorts] = useState('');
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('1024');
  const scan = usePortScanTool();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) return;

    let ports: number[] | undefined;
    let range: { start: number; end: number } | undefined;

    if (mode === 'custom' && customPorts.trim()) {
      ports = customPorts
        .split(',')
        .map((p) => parseInt(p.trim()))
        .filter((p) => !isNaN(p) && p > 0 && p <= 65535);
    } else if (mode === 'range') {
      range = { start: parseInt(rangeStart), end: parseInt(rangeEnd) };
    }

    scan.mutate({ host: host.trim(), ports, range });
  };

  const openPorts = scan.data?.ports.filter((p) => p.state === 'open') ?? [];

  return (
    <Card>
      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <Shield className="w-4 h-4 text-accent" />
        Port Scanner
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3 mb-4">
        <div className="flex gap-2">
          <DeviceSelector
            value={host}
            onChange={setHost}
            placeholder="Host o IP (ej: 192.168.1.1)"
            className="flex-1"
          />
          <Button type="submit" loading={scan.isPending} size="md">
            Escanear
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="radio" name="mode" checked={mode === 'common'} onChange={() => setMode('common')} className="accent-blue-500" />
            Puertos comunes
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="radio" name="mode" checked={mode === 'custom'} onChange={() => setMode('custom')} className="accent-blue-500" />
            Específicos
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="radio" name="mode" checked={mode === 'range'} onChange={() => setMode('range')} className="accent-blue-500" />
            Rango
          </label>
        </div>
        {mode === 'custom' && (
          <input
            type="text"
            placeholder="Puertos separados por coma (ej: 22,80,443,3389)"
            value={customPorts}
            onChange={(e) => setCustomPorts(e.target.value)}
            className="w-full bg-surface-light border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
        )}
        {mode === 'range' && (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Desde"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              min={1}
              max={65535}
              className="w-24 bg-surface-light border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent"
            />
            <span className="text-gray-500 text-sm">a</span>
            <input
              type="number"
              placeholder="Hasta"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              min={1}
              max={65535}
              className="w-24 bg-surface-light border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent"
            />
          </div>
        )}
      </form>

      {scan.isPending && (
        <p className="text-sm text-gray-400 animate-pulse">Escaneando puertos... esto puede tomar un momento</p>
      )}

      {scan.data && (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <span className="text-gray-400">
              Escaneados: <span className="text-gray-200 font-medium">{scan.data.ports.length}</span>
            </span>
            <span className="text-gray-400">
              Abiertos: <span className="text-emerald-400 font-medium">{openPorts.length}</span>
            </span>
            <span className="text-gray-400">
              Tiempo: <span className="text-gray-200 font-medium">{(scan.data.scanDuration / 1000).toFixed(1)}s</span>
            </span>
          </div>

          {openPorts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-xs">
                    <th className="text-left px-3 py-2 font-medium">Puerto</th>
                    <th className="text-left px-3 py-2 font-medium">Estado</th>
                    <th className="text-left px-3 py-2 font-medium">Servicio</th>
                  </tr>
                </thead>
                <tbody>
                  {openPorts.map((port) => (
                    <tr key={port.port} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 font-mono text-gray-200">{port.port}</td>
                      <td className="px-3 py-2">
                        <span className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          Abierto
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400">{port.service || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {openPorts.length === 0 && (
            <p className="text-sm text-gray-500">No se encontraron puertos abiertos.</p>
          )}
        </div>
      )}

      {scan.error && (
        <p className="text-sm text-red-400">Error: {(scan.error as Error).message}</p>
      )}
    </Card>
  );
}
