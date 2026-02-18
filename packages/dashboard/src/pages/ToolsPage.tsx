import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Radio, Route, Globe, Shield, Power, Calculator } from 'lucide-react';
import PingTool from '../components/tools/PingTool';
import TracerouteTool from '../components/tools/TracerouteTool';
import DnsLookupTool from '../components/tools/DnsLookupTool';
import PortScanTool from '../components/tools/PortScanTool';
import WakeOnLanTool from '../components/tools/WakeOnLanTool';
import SubnetCalcTool from '../components/tools/SubnetCalcTool';

const tools = [
  { id: 'ping', label: 'Ping', icon: Radio },
  { id: 'traceroute', label: 'Traceroute', icon: Route },
  { id: 'dns', label: 'DNS Lookup', icon: Globe },
  { id: 'ports', label: 'Port Scanner', icon: Shield },
  { id: 'wol', label: 'Wake-on-LAN', icon: Power },
  { id: 'subnet', label: 'Subred', icon: Calculator },
] as const;

type ToolId = (typeof tools)[number]['id'];

export default function ToolsPage() {
  const [searchParams] = useSearchParams();
  const toolParam = searchParams.get('tool') as ToolId | null;
  const hostParam = searchParams.get('host') ?? '';
  const macParam = searchParams.get('mac') ?? '';

  const [active, setActive] = useState<ToolId>(
    toolParam && tools.some((t) => t.id === toolParam) ? toolParam : 'ping'
  );

  // React to URL param changes
  useEffect(() => {
    if (toolParam && tools.some((t) => t.id === toolParam)) {
      setActive(toolParam);
    }
  }, [toolParam]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-200">Herramientas de Red</h1>

      {/* Tool selector tabs */}
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = active === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActive(tool.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-btn text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'bg-surface-light text-gray-400 hover:text-gray-200 hover:bg-white/10 border border-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tool.label}
            </button>
          );
        })}
      </div>

      {/* Active tool — pass initial values from URL params */}
      {active === 'ping' && <PingTool initialHost={toolParam === 'ping' ? hostParam : ''} />}
      {active === 'traceroute' && <TracerouteTool initialHost={toolParam === 'traceroute' ? hostParam : ''} />}
      {active === 'dns' && <DnsLookupTool />}
      {active === 'ports' && <PortScanTool initialHost={toolParam === 'ports' ? hostParam : ''} />}
      {active === 'wol' && <WakeOnLanTool initialMac={toolParam === 'wol' ? macParam : ''} />}
      {active === 'subnet' && <SubnetCalcTool />}
    </div>
  );
}
