import { useEffect, useRef } from 'react';

interface SpeedGaugeProps {
  value: number; // current Mbps
  max?: number;
  label: string;
  phase: 'idle' | 'ping' | 'download' | 'upload' | 'done';
  percent: number; // 0-100 progress
  color: string;
}

export default function SpeedGauge({ value, max = 300, label, phase, percent, color }: SpeedGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedValue = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2 + 10;
    const radius = 85;
    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;
    const totalAngle = endAngle - startAngle;

    function draw() {
      if (!ctx) return;
      // Smooth interpolation
      const target = phase === 'idle' || phase === 'done' ? 0 : value;
      animatedValue.current += (target - animatedValue.current) * 0.15;

      ctx.clearRect(0, 0, size, size);

      // Background arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Tick marks
      const ticks = 10;
      for (let i = 0; i <= ticks; i++) {
        const angle = startAngle + (i / ticks) * totalAngle;
        const inner = radius - 18;
        const outer = radius - 10;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tick labels
        const tickVal = Math.round((i / ticks) * max);
        if (i % 2 === 0) {
          const labelR = radius - 28;
          ctx.fillStyle = '#64748b';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            String(tickVal),
            cx + Math.cos(angle) * labelR,
            cy + Math.sin(angle) * labelR
          );
        }
      }

      // Value arc
      const valRatio = Math.min(animatedValue.current / max, 1);
      if (valRatio > 0.005) {
        const valAngle = startAngle + valRatio * totalAngle;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, valAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glow effect
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, valAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Needle
      const needleAngle = startAngle + valRatio * totalAngle;
      const needleLen = radius - 35;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(needleAngle) * needleLen,
        cy + Math.sin(needleAngle) * needleLen
      );
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Center circle
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();

      rafId.current = requestAnimationFrame(draw);
    }

    draw();

    return () => cancelAnimationFrame(rafId.current);
  }, [value, max, phase, color]);

  const displayValue = phase === 'ping' ? value : (phase === 'idle' ? 0 : value);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="mb-2" />
      <div className="text-center -mt-8">
        <div className="text-3xl font-bold text-gray-100" style={{ color }}>
          {displayValue > 0 ? displayValue.toFixed(1) : '—'}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {phase === 'ping' ? 'ms' : 'Mbps'}
        </div>
      </div>
      <div className="text-sm font-medium text-gray-400 mt-2">{label}</div>

      {/* Progress bar */}
      {phase !== 'idle' && phase !== 'done' && (
        <div className="w-full max-w-[200px] mt-3">
          <div className="h-1.5 bg-surface-dark rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${percent}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
