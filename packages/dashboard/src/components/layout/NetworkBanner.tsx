import { useState } from 'react';
import { AlertTriangle, Wifi, X } from 'lucide-react';
import { useNetworkStatus, useAcceptNetwork } from '../../hooks/useNetworkStatus';
import { useToast } from '../common/Toast';
import Button from '../common/Button';

export default function NetworkBanner() {
  const { data: status } = useNetworkStatus();
  const acceptNetwork = useAcceptNetwork();
  const { addToast } = useToast();
  const [dismissed, setDismissed] = useState(false);

  if (!status || status.isCorrectNetwork || dismissed) return null;

  const handleAccept = () => {
    acceptNetwork.mutate(undefined, {
      onSuccess: () => {
        addToast({ message: 'Red aceptada. Escaneos reanudados.', type: 'success' });
      },
      onError: () => {
        addToast({ message: 'Error al aceptar red', type: 'error' });
      },
    });
  };

  return (
    <div className="mx-4 mt-3 md:mx-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-300">Red diferente detectada</p>
        <p className="text-xs text-amber-400/70 mt-0.5">
          Subnet actual: <span className="font-mono">{status.currentSubnet}.0/24</span>
          {' \u2014 '}
          Esperada: <span className="font-mono">{status.expectedSubnet}.0/24</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Los escaneos y pings están pausados para evitar falsos positivos.
        </p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={handleAccept}>
            <Wifi className="w-3.5 h-3.5 mr-1" />
            Usar esta red
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDismissed(true)}>
            Ignorar
          </Button>
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className="text-gray-500 hover:text-gray-300">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
