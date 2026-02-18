import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import type { SpeedTestResult } from '@netcheckup/shared';

export default function SpeedHistoryChart({ data }: { data: SpeedTestResult[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
        Sin datos de speed test
      </div>
    );
  }

  const chartData = [...data].reverse().map((d) => ({
    time: format(new Date(d.timestamp), 'dd/MM HH:mm'),
    download: d.downloadMbps,
    upload: d.uploadMbps,
    ping: d.pingMs,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="download" name="Descarga (Mbps)" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="upload" name="Subida (Mbps)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
