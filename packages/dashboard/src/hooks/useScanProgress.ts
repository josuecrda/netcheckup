import { useState, useEffect, useCallback, useRef } from 'react';

export interface ScanProgress {
  isScanning: boolean;
  phase: string;
  message: string;
  current: number;
  total: number;
}

const INITIAL: ScanProgress = {
  isScanning: false,
  phase: '',
  message: '',
  current: 0,
  total: 0,
};

/**
 * Hook que escucha WebSocket events de scan para mostrar progreso en tiempo real.
 * Se conecta directamente al WS para recibir scan:started, scan:progress, scan:completed.
 */
export function useScanProgress(): ScanProgress {
  const [progress, setProgress] = useState<ScanProgress>(INITIAL);
  const wsRef = useRef<WebSocket | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'scan:started') {
        setProgress({
          isScanning: true,
          phase: 'starting',
          message: 'Iniciando escaneo de red...',
          current: 0,
          total: 0,
        });
      } else if (msg.type === 'scan:progress') {
        const p = msg.payload || {};
        setProgress({
          isScanning: true,
          phase: p.phase || 'scanning',
          message: p.message || 'Escaneando...',
          current: p.current || 0,
          total: p.total || 0,
        });
      } else if (msg.type === 'scan:completed') {
        const p = msg.payload || {};
        setProgress({
          isScanning: false,
          phase: 'completed',
          message: p.error
            ? 'Error durante el escaneo'
            : `Escaneo completado: ${p.devicesFound ?? 0} dispositivos`,
          current: 0,
          total: 0,
        });
        // Limpiar después de 3s
        setTimeout(() => setProgress(INITIAL), 3000);
      }
    } catch {
      // ignore non-JSON
    }
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener('message', handleMessage);

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      wsRef.current?.removeEventListener('message', handleMessage);
      wsRef.current?.close();
    };
  }, [handleMessage]);

  return progress;
}
