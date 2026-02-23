import { useState, useEffect, useRef } from 'react';
import { Radar, CheckCircle2, XCircle } from 'lucide-react';
import type { ScanProgress } from '../../hooks/useScanProgress';

interface ScanOverlayProps {
  progress: ScanProgress;
}

/**
 * Simula progreso suave durante fases largas (arp-sweep ~25s).
 * Avanza rápido al inicio y se desacelera para no llegar a 100%.
 */
function useSimulatedProgress(isActive: boolean, phase: string) {
  const [pct, setPct] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (isActive && (phase === 'arp-sweep' || phase === 'starting')) {
      setPct(0);
      let current = 0;
      intervalRef.current = setInterval(() => {
        // Incremento que se desacelera: empieza rápido, frena al acercarse a 85%
        const remaining = 85 - current;
        const increment = Math.max(0.3, remaining * 0.04);
        current = Math.min(85, current + increment);
        setPct(Math.round(current));
      }, 300);
    } else if (phase === 'processing' || phase === 'resolving') {
      // Saltar a 90% cuando sale de arp-sweep
      setPct(90);
      clearInterval(intervalRef.current);
    } else if (phase === 'completed') {
      setPct(100);
      clearInterval(intervalRef.current);
    } else {
      setPct(0);
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, phase]);

  return pct;
}

export default function ScanOverlay({ progress }: ScanOverlayProps) {
  const { isScanning, phase, message, current, total } = progress;
  const simulatedPct = useSimulatedProgress(isScanning, phase);

  // No mostrar nada si no hay scan activo ni completado recientemente
  if (!isScanning && phase !== 'completed') return null;

  // Calcular porcentaje real para la fase resolving
  const resolvingPct = total > 0 ? 90 + Math.round((current / total) * 10) : 90;
  const displayPct = phase === 'resolving' ? resolvingPct : simulatedPct;

  const isComplete = phase === 'completed';
  const hasError = isComplete && message.includes('Error');

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition-all duration-500 ${
        isComplete
          ? hasError
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-accent/5 border-accent/20'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        {isComplete ? (
          hasError ? (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          )
        ) : (
          <Radar className="w-5 h-5 text-accent animate-pulse flex-shrink-0" />
        )}

        {/* Message + progress bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${
              isComplete
                ? hasError ? 'text-red-300' : 'text-emerald-300'
                : 'text-gray-200'
            }`}>
              {message}
            </p>
            {isScanning && (
              <span className="text-xs text-gray-500 ml-2 tabular-nums">{displayPct}%</span>
            )}
          </div>

          {/* Unified progress bar */}
          {(isScanning || isComplete) && (
            <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isComplete
                    ? hasError ? 'bg-red-400' : 'bg-emerald-400'
                    : 'bg-accent'
                }`}
                style={{ width: `${displayPct}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
