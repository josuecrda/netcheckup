import { useState } from 'react';
import { Calculator } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useSubnetCalcTool } from '../../hooks/useTools';

export default function SubnetCalcTool() {
  const [ip, setIp] = useState('');
  const [mask, setMask] = useState('24');
  const calc = useSubnetCalcTool();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim() || !mask.trim()) return;
    calc.mutate({ ip: ip.trim(), mask: mask.trim() });
  };

  return (
    <Card>
      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-accent" />
        Calculadora de Subred
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="IP (ej: 192.168.1.0)"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          className="flex-1 min-w-[180px] bg-surface-light border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent font-mono"
        />
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-sm">/</span>
          <input
            type="text"
            placeholder="Máscara (ej: 24)"
            value={mask}
            onChange={(e) => setMask(e.target.value)}
            className="w-40 bg-surface-light border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent font-mono"
          />
        </div>
        <Button type="submit" loading={calc.isPending} size="md">
          Calcular
        </Button>
      </form>

      {calc.data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Dirección de red" value={calc.data.networkAddress} />
          <Field label="Broadcast" value={calc.data.broadcastAddress} />
          <Field label="Primer host" value={calc.data.firstHost} />
          <Field label="Último host" value={calc.data.lastHost} />
          <Field label="Total hosts" value={calc.data.totalHosts.toLocaleString()} />
          <Field label="CIDR" value={`/${calc.data.cidr}`} />
          <Field label="Máscara" value={calc.data.mask} />
          <Field label="Wildcard" value={calc.data.wildcardMask} />
          <Field label="Clase" value={calc.data.ipClass} />
          <Field label="Privada" value={calc.data.isPrivate ? 'Sí' : 'No'} />
          <div className="sm:col-span-2">
            <Field label="Máscara (binario)" value={calc.data.binaryMask} mono />
          </div>
        </div>
      )}

      {calc.error && (
        <p className="text-sm text-red-400">Error: {(calc.error as Error).message}</p>
      )}
    </Card>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-black/20 rounded-lg p-2.5">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm text-gray-200 font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
