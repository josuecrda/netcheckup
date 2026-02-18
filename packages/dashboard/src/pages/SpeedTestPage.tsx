import { ArrowDown, ArrowUp, Timer, Play } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import SpeedGauge from '../components/dashboard/SpeedGauge';
import SpeedHistoryChart from '../components/charts/SpeedHistoryChart';
import { useSpeedTests, useLatestSpeedTest, useSpeedTestAverage, useRunSpeedTest } from '../hooks/useSpeedTest';
import { useSpeedTestLive } from '../hooks/useSpeedTestLive';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const phaseLabels = {
  idle: 'Listo para medir',
  ping: 'Midiendo ping...',
  download: 'Midiendo descarga...',
  upload: 'Midiendo subida...',
  done: 'Completado',
};

export default function SpeedTestPage() {
  const { data: tests, isLoading } = useSpeedTests(20);
  const { data: latest } = useLatestSpeedTest();
  const { data: avg } = useSpeedTestAverage('7d');
  const runTest = useRunSpeedTest();
  const live = useSpeedTestLive();

  if (isLoading) return <Spinner />;

  const showGauge = live.isRunning || live.phase === 'done';

  return (
    <div className="space-y-6">
      {/* Live test section */}
      <Card>
        <div className="flex flex-col items-center">
          {/* Phase label */}
          <div className="flex items-center gap-2 mb-4">
            {live.isRunning && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
              </span>
            )}
            <span className={`text-sm font-medium ${live.isRunning ? 'text-accent' : 'text-gray-400'}`}>
              {phaseLabels[live.phase]}
            </span>
          </div>

          {/* Gauge or button */}
          {showGauge ? (
            <div className="flex flex-col items-center">
              <SpeedGauge
                value={live.phase === 'ping' ? live.value : live.value}
                max={live.phase === 'ping' ? 500 : 300}
                label={
                  live.phase === 'ping' ? 'Ping'
                    : live.phase === 'download' ? 'Descarga'
                    : live.phase === 'upload' ? 'Subida'
                    : 'Test Completo'
                }
                phase={live.phase}
                percent={live.percent}
                color={
                  live.phase === 'ping' ? '#f59e0b'
                    : live.phase === 'download' ? '#10b981'
                    : live.phase === 'upload' ? '#3b82f6'
                    : '#10b981'
                }
              />

              {/* Results summary during/after test */}
              {(live.phase !== 'idle' && live.phase !== 'ping') && (
                <div className="flex gap-8 mt-6">
                  {live.finalPing > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Ping</p>
                      <p className="text-lg font-bold text-amber-400">{live.finalPing} <span className="text-xs font-normal">ms</span></p>
                    </div>
                  )}
                  {live.finalDownload > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Descarga</p>
                      <p className="text-lg font-bold text-emerald-400">{live.finalDownload.toFixed(1)} <span className="text-xs font-normal">Mbps</span></p>
                    </div>
                  )}
                  {live.finalUpload > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Subida</p>
                      <p className="text-lg font-bold text-blue-400">{live.finalUpload.toFixed(1)} <span className="text-xs font-normal">Mbps</span></p>
                    </div>
                  )}
                </div>
              )}

              {live.phase === 'done' && (
                <Button
                  variant="secondary"
                  className="mt-6"
                  icon={<Play className="w-4 h-4" />}
                  loading={runTest.isPending}
                  onClick={() => runTest.mutate()}
                >
                  Ejecutar de nuevo
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <div className="w-32 h-32 rounded-full border-4 border-surface-light flex items-center justify-center mb-6 hover:border-accent/50 transition-colors cursor-pointer group"
                onClick={() => !runTest.isPending && runTest.mutate()}
              >
                <Play className="w-10 h-10 text-gray-400 group-hover:text-accent transition-colors ml-1" />
              </div>
              <Button
                icon={<Play className="w-4 h-4" />}
                loading={runTest.isPending}
                onClick={() => runTest.mutate()}
                size="lg"
              >
                Iniciar Speed Test
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Previous result cards */}
      {latest && !live.isRunning && live.phase !== 'done' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <ArrowDown className="w-4 h-4" /> Descarga
            </div>
            <p className="text-3xl font-bold text-emerald-400">{latest.downloadMbps.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">Mbps</p>
            {latest.downloadPercent != null && (
              <p className={`text-xs mt-1 ${latest.downloadPercent >= 80 ? 'text-emerald-400' : latest.downloadPercent >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                {latest.downloadPercent.toFixed(0)}% del contratado
              </p>
            )}
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <ArrowUp className="w-4 h-4" /> Subida
            </div>
            <p className="text-3xl font-bold text-blue-400">{latest.uploadMbps.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">Mbps</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Timer className="w-4 h-4" /> Ping
            </div>
            <p className="text-3xl font-bold text-amber-400">{latest.pingMs.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-1">ms</p>
          </Card>
        </div>
      )}

      {/* Average stats */}
      {avg && avg.count > 0 && (
        <Card>
          <p className="text-sm text-gray-400 mb-3">Promedio de los últimos 7 días ({avg.count} pruebas)</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-400">{avg.avgDownload.toFixed(1)}</p>
              <p className="text-xs text-gray-500">Mbps descarga</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-400">{avg.avgUpload.toFixed(1)}</p>
              <p className="text-xs text-gray-500">Mbps subida</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">{avg.avgPing.toFixed(0)}</p>
              <p className="text-xs text-gray-500">ms ping</p>
            </div>
          </div>
        </Card>
      )}

      {/* History chart */}
      <Card>
        <p className="text-sm font-medium text-gray-300 mb-4">Historial de Speed Test</p>
        <SpeedHistoryChart data={tests ?? []} />
      </Card>

      {/* History table */}
      {tests && tests.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-4 pb-2">
            <p className="text-sm font-medium text-gray-300">Resultados</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-xs">
                  <th className="text-left px-5 py-2 font-medium">Fecha</th>
                  <th className="text-right px-3 py-2 font-medium">Descarga</th>
                  <th className="text-right px-3 py-2 font-medium">Subida</th>
                  <th className="text-right px-3 py-2 font-medium">Ping</th>
                  <th className="text-right px-5 py-2 font-medium">Iniciado</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-5 py-2.5 text-gray-300">
                      {format(new Date(t.timestamp), 'dd MMM HH:mm', { locale: es })}
                    </td>
                    <td className="text-right px-3 py-2.5 text-emerald-400 font-medium">
                      {t.downloadMbps.toFixed(1)} Mbps
                    </td>
                    <td className="text-right px-3 py-2.5 text-blue-400 font-medium">
                      {t.uploadMbps.toFixed(1)} Mbps
                    </td>
                    <td className="text-right px-3 py-2.5 text-amber-400">
                      {t.pingMs.toFixed(0)} ms
                    </td>
                    <td className="text-right px-5 py-2.5 text-gray-500 capitalize">
                      {t.triggeredBy === 'manual' ? 'Manual' : 'Programado'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
