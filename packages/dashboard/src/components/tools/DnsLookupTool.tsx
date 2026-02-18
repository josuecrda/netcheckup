import { useState } from 'react';
import { Globe } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useDnsLookupTool } from '../../hooks/useTools';

const DNS_TYPES = ['ALL', 'A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'] as const;

export default function DnsLookupTool() {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState<string>('ALL');
  const dns = useDnsLookupTool();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    dns.mutate({ domain: domain.trim(), type: type === 'ALL' ? undefined : type });
  };

  return (
    <Card>
      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <Globe className="w-4 h-4 text-accent" />
        DNS Lookup
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Dominio (ej: google.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1 min-w-[200px] bg-surface-light border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-surface-light border border-white/10 rounded-btn px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent"
        >
          {DNS_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'Todos' : t}</option>
          ))}
        </select>
        <Button type="submit" loading={dns.isPending} size="md">
          Consultar
        </Button>
      </form>

      {dns.data && (
        <div className="space-y-3">
          <div className="bg-black/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Tiempo de respuesta</p>
            <p className="text-sm font-medium text-emerald-400">{dns.data.responseTimeMs} ms</p>
          </div>

          {dns.data.addresses.length > 0 && (
            <Section title="Direcciones IP (A/AAAA)">
              {dns.data.addresses.map((addr, i) => (
                <Code key={i}>{addr}</Code>
              ))}
            </Section>
          )}

          {dns.data.cname && (
            <Section title="CNAME">
              <Code>{dns.data.cname}</Code>
            </Section>
          )}

          {dns.data.mx.length > 0 && (
            <Section title="MX (Mail Exchange)">
              {dns.data.mx.map((mx, i) => (
                <Code key={i}>
                  <span className="text-gray-500">prioridad {mx.priority}:</span> {mx.exchange}
                </Code>
              ))}
            </Section>
          )}

          {dns.data.ns.length > 0 && (
            <Section title="NS (Nameservers)">
              {dns.data.ns.map((ns, i) => (
                <Code key={i}>{ns}</Code>
              ))}
            </Section>
          )}

          {dns.data.txt.length > 0 && (
            <Section title="TXT">
              {dns.data.txt.map((txt, i) => (
                <Code key={i} wrap>{txt}</Code>
              ))}
            </Section>
          )}
        </div>
      )}

      {dns.error && (
        <p className="text-sm text-red-400">Error: {(dns.error as Error).message}</p>
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Code({ children, wrap = false }: { children: React.ReactNode; wrap?: boolean }) {
  return (
    <div className={`bg-black/30 rounded px-2.5 py-1.5 text-sm text-gray-200 font-mono ${wrap ? 'break-all' : ''}`}>
      {children}
    </div>
  );
}
