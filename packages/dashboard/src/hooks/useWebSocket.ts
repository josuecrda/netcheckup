import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WSEvent, WSEventType } from '@netcheckup/shared';

export function useWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  const invalidate = useCallback(
    (keys: string[][]) => {
      for (const key of keys) qc.invalidateQueries({ queryKey: key });
    },
    [qc],
  );

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg: WSEvent = JSON.parse(event.data);
          handleEvent(msg);
        } catch {
          // ignore non-JSON
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function handleEvent(event: WSEvent) {
      const handlers: Partial<Record<WSEventType, string[][]>> = {
        'scan:completed': [['devices'], ['devices', 'summary'], ['scans']],
        'scan:started': [['scans']],
        'device:updated': [['devices'], ['devices', 'summary']],
        'device:new': [['devices'], ['devices', 'summary'], ['alerts']],
        'metric:new': [['devices']],
        'alert:new': [['alerts'], ['alerts', 'unread-count']],
        'speedtest:completed': [['speedtest']],
        'speedtest:started': [['speedtest']],
        'health:updated': [['health'], ['health', 'problems'], ['health', 'history']],
      };

      const keys = handlers[event.type];
      if (keys) invalidate(keys);
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [invalidate]);
}
