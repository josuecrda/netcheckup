import { Radar, RefreshCw } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useToast } from '../common/Toast';
import { useTriggerDiscovery, useTriggerPing } from '../../hooks/useScans';

export default function QuickActions() {
  const discovery = useTriggerDiscovery();
  const ping = useTriggerPing();
  const { addToast, updateToast } = useToast();

  const handleDiscovery = () => {
    const id = addToast({ message: 'Escaneando red...', type: 'loading' });
    discovery.mutate(undefined, {
      onSuccess: () => updateToast(id, { message: 'Red escaneada correctamente', type: 'success' }),
      onError: () => updateToast(id, { message: 'Error al escanear la red', type: 'error' }),
    });
  };

  const handlePing = () => {
    const id = addToast({ message: 'Ejecutando ping...', type: 'loading' });
    ping.mutate(undefined, {
      onSuccess: () => updateToast(id, { message: 'Ping completado', type: 'success' }),
      onError: () => updateToast(id, { message: 'Error en ping', type: 'error' }),
    });
  };

  return (
    <Card>
      <p className="text-sm text-gray-400 mb-3">Acciones Rápidas</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Radar className="w-4 h-4" />}
          loading={discovery.isPending}
          onClick={handleDiscovery}
        >
          Escanear Red
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="w-4 h-4" />}
          loading={ping.isPending}
          onClick={handlePing}
        >
          Ping
        </Button>
      </div>
    </Card>
  );
}
