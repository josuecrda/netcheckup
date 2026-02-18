import { ArrowUp, Timer, Play, ArrowRight, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import { useLatestSpeedTest } from '../../hooks/useSpeedTest';

function MiniGauge({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const radius = 28;
  const circumference = Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width="64" height="38" viewBox="0 0 68 40">
      <path
        d="M 6 36 A 28 28 0 0 1 62 36"
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M 6 36 A 28 28 0 0 1 62 36"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={`${offset}`}
        className="transition-all duration-700"
      />
    </svg>
  );
}

export default function SpeedTestWidget() {
  const { data, isLoading } = useLatestSpeedTest();
  const navigate = useNavigate();

  const handleRunSpeedTest = () => {
    navigate('/speed-test?autorun=true');
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <div className="h-20 bg-white/5 animate-pulse rounded" />
      </Card>
    );
  }

  // No data — CTA that fills the whole card
  if (!data) {
    return (
      <Card className="h-full flex flex-col">
        <p className="text-sm text-gray-400 mb-3">Speed Test</p>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
            <Gauge className="w-6 h-6 text-accent" />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Mide tu velocidad</p>
          <p className="text-gray-600 text-xs mb-4">Compara tu velocidad real vs la contratada</p>
          <button
            onClick={handleRunSpeedTest}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Ejecutar Speed Test
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">Speed Test</p>
        <button
          onClick={() => navigate('/speed-test')}
          className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
        >
          Historial <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Main: gauge + speed — flex-1 to center vertically */}
      <div className="flex-1 flex items-center gap-3">
        <MiniGauge value={data.downloadMbps} max={200} color="#10b981" />
        <div>
          <div>
            <span className="text-2xl font-bold text-emerald-400">{data.downloadMbps.toFixed(0)}</span>
            <span className="text-xs text-gray-500 ml-1">Mbps</span>
          </div>
          <p className="text-[10px] text-gray-600">descarga</p>
        </div>
      </div>

      {/* Upload + Ping + Run button row — always at bottom */}
      <div className="grid grid-cols-3 gap-2 pt-3 mt-auto border-t border-white/5">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 text-[10px] mb-0.5">
            <ArrowUp className="w-2.5 h-2.5" /> Subida
          </div>
          <span className="text-xs font-bold text-blue-400">{data.uploadMbps.toFixed(1)}</span>
          <span className="text-[10px] text-gray-500 ml-0.5">Mbps</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 text-[10px] mb-0.5">
            <Timer className="w-2.5 h-2.5" /> Ping
          </div>
          <span className="text-xs font-bold text-amber-400">{data.pingMs.toFixed(0)}</span>
          <span className="text-[10px] text-gray-500 ml-0.5">ms</span>
        </div>
        <button
          onClick={handleRunSpeedTest}
          className="flex items-center justify-center gap-1 bg-accent/10 hover:bg-accent/20 text-accent text-[10px] font-medium py-1.5 rounded-lg transition-colors"
        >
          <Play className="w-2.5 h-2.5" />
          Nuevo
        </button>
      </div>
    </Card>
  );
}
