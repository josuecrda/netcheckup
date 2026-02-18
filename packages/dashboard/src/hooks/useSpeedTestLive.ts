import { useState, useEffect, useRef } from 'react';

export type SpeedPhase = 'idle' | 'ping' | 'download' | 'upload' | 'done';

export interface SpeedTestLiveState {
  phase: SpeedPhase;
  /** Current live speed (Mbps) or ping (ms) */
  value: number;
  /** 0-100 progress within current phase */
  percent: number;
  /** Final results once done */
  finalDownload: number;
  finalUpload: number;
  finalPing: number;
  /** Is test running? */
  isRunning: boolean;
}

/**
 * Listens to WebSocket for real-time speed test progress events.
 * Returns live state that can be used by the SpeedGauge component.
 */
export function useSpeedTestLive(): SpeedTestLiveState {
  const [state, setState] = useState<SpeedTestLiveState>({
    phase: 'idle',
    value: 0,
    percent: 0,
    finalDownload: 0,
    finalUpload: 0,
    finalPing: 0,
    isRunning: false,
  });

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'speedtest:started') {
            setState({
              phase: 'ping',
              value: 0,
              percent: 0,
              finalDownload: 0,
              finalUpload: 0,
              finalPing: 0,
              isRunning: true,
            });
          } else if (msg.type === 'speedtest:progress') {
            const { phase, value, percent } = msg.payload;
            setState((prev) => {
              const next = { ...prev, phase, value, percent, isRunning: true };
              // Accumulate final values per phase
              if (phase === 'ping') next.finalPing = value;
              if (phase === 'download') next.finalDownload = value;
              if (phase === 'upload') next.finalUpload = value;
              if (phase === 'done') next.isRunning = false;
              return next;
            });
          } else if (msg.type === 'speedtest:completed') {
            setState((prev) => ({
              ...prev,
              phase: 'done',
              isRunning: false,
              percent: 100,
              // Keep the final values from the last progress updates
            }));
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, []);

  return state;
}
