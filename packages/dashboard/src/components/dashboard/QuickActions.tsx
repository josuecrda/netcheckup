import { Radar, Gauge, RefreshCw } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useTriggerDiscovery, useTriggerPing } from '../../hooks/useScans';
import { useRunSpeedTest } from '../../hooks/useSpeedTest';

export default function QuickActions() {
  const discovery = useTriggerDiscovery();
  const ping = useTriggerPing();
  const speedTest = useRunSpeedTest();

  return (
    <Card>
      <p className="text-sm text-gray-400 mb-3">Acciones Rápidas</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Radar className="w-4 h-4" />}
          loading={discovery.isPending}
          onClick={() => discovery.mutate()}
        >
          Escanear Red
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="w-4 h-4" />}
          loading={ping.isPending}
          onClick={() => ping.mutate()}
        >
          Ping
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Gauge className="w-4 h-4" />}
          loading={speedTest.isPending}
          onClick={() => speedTest.mutate()}
        >
          Speed Test
        </Button>
      </div>
    </Card>
  );
}
