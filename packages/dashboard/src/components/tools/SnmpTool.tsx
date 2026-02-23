import { useState } from 'react';
import { Server, Loader2, Network } from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import DeviceSelector from './DeviceSelector';
import { toolsApi } from '../../lib/api';

interface SnmpInterface {
  index: number;
  name: string;
  typeName: string;
  speed: number;
  speedFormatted: string;
  operStatus: string;
  inOctets: number;
  outOctets: number;
}

interface SnmpResult {
  host: string;
  community: string;
  system: {
    sysDescr: string;
    sysName: string;
    sysUpTime: string;
    sysContact: string;
    sysLocation: string;
    ifNumber: number;
  };
  interfaces: SnmpInterface[];
  queryTimeMs: number;
}

export default function SnmpTool({ initialHost = '' }: { initialHost?: string }) {
  const [host, setHost] = useState(initialHost);
  const [community, setCommunity] = useState('public');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SnmpResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    if (!host) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await toolsApi.snmpQuery(host, community, 5000);
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  function formatBytes(bytes: number): string {
    if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
    if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <DeviceSelector value={host} onChange={setHost} mode="ip" placeholder="IP del dispositivo" />
        </div>
        <div className="w-full sm:w-40">
          <input
            type="text"
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            placeholder="Community string"
            className="w-full bg-surface-dark border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50"
          />
        </div>
        <Button onClick={handleQuery} loading={loading} disabled={!host}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
          Consultar
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-btn bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
          <p className="text-xs text-gray-500 mt-1">El dispositivo puede no tener SNMP habilitado o la community string es incorrecta.</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* System info */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-accent" />
              <p className="text-sm font-medium text-gray-300">Información del Sistema</p>
              <span className="ml-auto text-xs text-gray-500">{result.queryTimeMs}ms</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoRow label="Nombre" value={result.system.sysName} />
              <InfoRow label="Uptime" value={result.system.sysUpTime} />
              <InfoRow label="Descripción" value={result.system.sysDescr} full />
              <InfoRow label="Contacto" value={result.system.sysContact} />
              <InfoRow label="Ubicación" value={result.system.sysLocation} />
              <InfoRow label="Interfaces" value={String(result.system.ifNumber)} />
            </div>
          </Card>

          {/* Interfaces */}
          {result.interfaces.length > 0 && (
            <Card padding={false}>
              <div className="flex items-center gap-2 p-4 pb-2">
                <Network className="w-4 h-4 text-accent" />
                <p className="text-sm font-medium text-gray-300">Interfaces ({result.interfaces.length})</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-xs text-gray-500">
                      <th className="text-left px-4 py-2">#</th>
                      <th className="text-left px-4 py-2">Nombre</th>
                      <th className="text-left px-4 py-2">Tipo</th>
                      <th className="text-left px-4 py-2">Velocidad</th>
                      <th className="text-left px-4 py-2">Estado</th>
                      <th className="text-right px-4 py-2">Entrada</th>
                      <th className="text-right px-4 py-2">Salida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.interfaces.map((iface) => (
                      <tr key={iface.index} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-2 text-gray-500">{iface.index}</td>
                        <td className="px-4 py-2 text-gray-200 font-mono text-xs">{iface.name}</td>
                        <td className="px-4 py-2 text-gray-400">{iface.typeName}</td>
                        <td className="px-4 py-2 text-gray-300">{iface.speedFormatted}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1 text-xs ${
                            iface.operStatus === 'up' ? 'text-emerald-400' : 'text-gray-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              iface.operStatus === 'up' ? 'bg-emerald-400' : 'bg-gray-600'
                            }`} />
                            {iface.operStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-300 text-xs">{formatBytes(iface.inOctets)}</td>
                        <td className="px-4 py-2 text-right text-gray-300 text-xs">{formatBytes(iface.outOctets)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  if (!value) return null;
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <span className="text-xs text-gray-500">{label}</span>
      <p className="text-gray-200 break-all">{value}</p>
    </div>
  );
}
