import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { format } from 'date-fns';

interface DataPoint {
  timestamp: string;
  latencyMs: number;
  packetLoss: number;
}

export default function LatencyChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        Sin datos de latencia
      </div>
    );
  }

  const chartData = data.map((d) => ({
    time: new Date(d.timestamp).getTime(),
    latency: d.latencyMs,
    packetLoss: d.packetLoss,
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => format(new Date(v), 'HH:mm')}
            stroke="#64748b"
            fontSize={11}
          />
          <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}ms`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            labelFormatter={(v) => format(new Date(v as number), 'dd/MM HH:mm')}
            formatter={(value: number) => [`${value.toFixed(1)} ms`, 'Latencia']}
          />
          <Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="url(#latGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
