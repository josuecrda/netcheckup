import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Radio, Route, Globe, Shield, Power, Calculator, Wrench, Server, Lock, Activity } from 'lucide-react';
import PingTool from '../components/tools/PingTool';
import TracerouteTool from '../components/tools/TracerouteTool';
import DnsLookupTool from '../components/tools/DnsLookupTool';
import PortScanTool from '../components/tools/PortScanTool';
import WakeOnLanTool from '../components/tools/WakeOnLanTool';
import SubnetCalcTool from '../components/tools/SubnetCalcTool';
import SnmpTool from '../components/tools/SnmpTool';
import PortHealthTool from '../components/tools/PortHealthTool';
import { useLicense } from '../hooks/useLicense';

const tools = [
  { id: 'ping', label: 'Ping', icon: Radio, description: 'Verifica si un host responde y mide la latencia' },
  { id: 'traceroute', label: 'Traceroute', icon: Route, description: 'Traza la ruta de paquetes hacia un destino' },
  { id: 'dns', label: 'DNS Lookup', icon: Globe, description: 'Consulta registros DNS de un dominio' },
  { id: 'ports', label: 'Port Scanner', icon: Shield, description: 'Escanea puertos abiertos en un host' },
  { id: 'wol', label: 'Wake-on-LAN', icon: Power, description: 'Enciende dispositivos remotamente por red' },
  { id: 'subnet', label: 'Subred', icon: Calculator, description: 'Calcula rangos y detalles de una subred' },
  { id: 'snmp', label: 'SNMP', icon: Server, description: 'Consulta información SNMP de switches y routers' },
  { id: 'port-health', label: 'Salud de Puertos', icon: Activity, description: 'Monitoreo de utilización, errores y estado de puertos de switches (SNMP)' },
] as const;

type ToolId = (typeof tools)[number]['id'];

export default function ToolsPage() {
  const [searchParams] = useSearchParams();
  const toolParam = searchParams.get('tool') as ToolId | null;
  const hostParam = searchParams.get('host') ?? '';
  const macParam = searchParams.get('mac') ?? '';
  const { data: license } = useLicense();
  const canSnmp = license?.limits?.snmpEnabled ?? false;

  const [active, setActive] = useState<ToolId>(
    toolParam && tools.some((t) => t.id === toolParam) ? toolParam : 'ping'
  );

  // React to URL param changes
  useEffect(() => {
    if (toolParam && tools.some((t) => t.id === toolParam)) {
      setActive(toolParam);
    }
  }, [toolParam]);

  const activeTool = tools.find((t) => t.id === active)!;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Wrench className="w-5 h-5 text-accent" />
        <h1 className="text-lg font-semibold text-gray-200">Herramientas de Red</h1>
      </div>

      {/* Tool selector tabs — horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 min-w-max">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = active === tool.id;
            const isLocked = (tool.id === 'snmp' || tool.id === 'port-health') && !canSnmp;
            return (
              <button
                key={tool.id}
                onClick={() => setActive(tool.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-btn text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'bg-surface-light text-gray-400 hover:text-gray-200 hover:bg-white/10 border border-white/5'
                } ${isLocked ? 'opacity-60' : ''}`}
              >
                <Icon className="w-4 h-4" />
                {tool.label}
                {isLocked && <Lock className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tool description */}
      <p className="text-sm text-gray-500">{activeTool.description}</p>

      {/* Active tool — pass initial values from URL params */}
      {active === 'ping' && <PingTool initialHost={toolParam === 'ping' ? hostParam : ''} />}
      {active === 'traceroute' && <TracerouteTool initialHost={toolParam === 'traceroute' ? hostParam : ''} />}
      {active === 'dns' && <DnsLookupTool />}
      {active === 'ports' && <PortScanTool initialHost={toolParam === 'ports' ? hostParam : ''} />}
      {active === 'wol' && <WakeOnLanTool initialMac={toolParam === 'wol' ? macParam : ''} />}
      {active === 'subnet' && <SubnetCalcTool />}
      {active === 'snmp' && (canSnmp ? (
        <SnmpTool initialHost={toolParam === 'snmp' ? hostParam : ''} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Lock className="w-8 h-8 text-gray-500" />
          <p className="text-sm text-gray-400">
            SNMP requiere el plan <span className="text-accent font-medium">Consultoría</span>.
          </p>
          <Link to="/settings" className="text-sm text-accent hover:underline">
            Ver planes disponibles →
          </Link>
        </div>
      ))}
      {active === 'port-health' && (canSnmp ? (
        <PortHealthTool />
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Lock className="w-8 h-8 text-gray-500" />
          <p className="text-sm text-gray-400">
            Salud de Puertos requiere el plan <span className="text-accent font-medium">Consultoría</span>.
          </p>
          <Link to="/settings" className="text-sm text-accent hover:underline">
            Ver planes disponibles →
          </Link>
        </div>
      ))}
    </div>
  );
}
