import { useState } from 'react';
import { Power } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import DeviceSelector from './DeviceSelector';
import { useWakeOnLanTool } from '../../hooks/useTools';

interface WakeOnLanToolProps {
  initialMac?: string;
}

export default function WakeOnLanTool({ initialMac = '' }: WakeOnLanToolProps) {
  const [mac, setMac] = useState(initialMac);
  const wol = useWakeOnLanTool();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mac.trim()) return;
    wol.mutate({ macAddress: mac.trim() });
  };

  return (
    <Card>
      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <Power className="w-4 h-4 text-accent" />
        Wake-on-LAN
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        Envía un "magic packet" para encender remotamente un dispositivo. El dispositivo debe soportar WoL y estar conectado por cable Ethernet.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <DeviceSelector
          value={mac}
          onChange={setMac}
          mode="mac"
          placeholder="MAC address (ej: AA:BB:CC:DD:EE:FF)"
          className="flex-1"
        />
        <Button type="submit" loading={wol.isPending} size="md">
          Encender
        </Button>
      </form>

      {wol.data && (
        <div className={`p-3 rounded-lg text-sm ${wol.data.success ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
          {wol.data.message}
        </div>
      )}

      {wol.error && (
        <p className="text-sm text-red-400">Error: {(wol.error as Error).message}</p>
      )}
    </Card>
  );
}
