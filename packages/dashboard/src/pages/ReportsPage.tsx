import { useState } from 'react';
import { FileText, Download, Calendar, Clock, Loader2, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { useLicense } from '../hooks/useLicense';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function ReportsPage() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: license } = useLicense();

  const canPdf = license?.limits?.pdfReports ?? false;

  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weeklyEnabled = (settings as any)?.weeklyReportEnabled ?? false;
  const weeklyDay = (settings as any)?.weeklyReportDay ?? 1;
  const monthlyEnabled = (settings as any)?.monthlyReportEnabled ?? false;

  const handleGenerate = async (period: string) => {
    setGenerating(period);
    setError(null);
    try {
      const res = await fetch(`/api/reports/health-pdf?period=${period}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `reporte_${period}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(null);
    }
  };

  const toggleWeekly = () => {
    updateSettings.mutate({ weeklyReportEnabled: !weeklyEnabled } as any);
  };

  const toggleMonthly = () => {
    updateSettings.mutate({ monthlyReportEnabled: !monthlyEnabled } as any);
  };

  const setWeeklyDay = (day: number) => {
    updateSettings.mutate({ weeklyReportDay: day } as any);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Generate report */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-accent" />
          <p className="text-sm font-medium text-gray-300">Generar Reporte PDF</p>
        </div>

        {!canPdf ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Lock className="w-8 h-8 text-gray-500" />
            <p className="text-sm text-gray-400">
              Los reportes PDF requieren un plan de <span className="text-accent font-medium">Monitoreo</span> o superior.
            </p>
            <Link
              to="/settings"
              className="text-sm text-accent hover:underline"
            >
              Ver planes disponibles →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-5">
              Genera un reporte completo con el health score, dispositivos, velocidad de internet,
              problemas activos y alertas recientes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ReportButton
                label="Últimas 24 horas"
                period="24h"
                generating={generating}
                onClick={handleGenerate}
              />
              <ReportButton
                label="Últimos 7 días"
                period="7d"
                generating={generating}
                onClick={handleGenerate}
              />
              <ReportButton
                label="Últimos 30 días"
                period="30d"
                generating={generating}
                onClick={handleGenerate}
              />
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-btn bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Scheduled reports — solo visible con plan que permite PDF */}
      {canPdf && <Card>
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-accent" />
          <p className="text-sm font-medium text-gray-300">Reportes Programados</p>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          Configura la generación automática de reportes. Los reportes se guardarán
          y estarán disponibles para descargar.
        </p>

        <div className="space-y-4">
          {/* Weekly toggle */}
          <div className="flex items-center justify-between p-4 rounded-btn bg-surface-dark border border-white/5">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-200">Reporte semanal</p>
                <p className="text-xs text-gray-500">Se genera automáticamente cada semana</p>
              </div>
            </div>
            <button
              onClick={toggleWeekly}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                weeklyEnabled ? 'bg-accent' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  weeklyEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Weekly day selector */}
          {weeklyEnabled && (
            <div className="pl-11">
              <label className="block text-xs text-gray-500 mb-2">Día de la semana</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => setWeeklyDay(i)}
                    className={`px-3 py-1.5 text-xs rounded-btn transition-colors ${
                      weeklyDay === i
                        ? 'bg-accent text-white'
                        : 'bg-surface-dark text-gray-400 hover:text-gray-200 border border-white/10'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly toggle */}
          <div className="flex items-center justify-between p-4 rounded-btn bg-surface-dark border border-white/5">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-200">Reporte mensual</p>
                <p className="text-xs text-gray-500">Se genera el primer día de cada mes</p>
              </div>
            </div>
            <button
              onClick={toggleMonthly}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                monthlyEnabled ? 'bg-accent' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  monthlyEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>}
    </div>
  );
}

function ReportButton({ label, period, generating, onClick }: {
  label: string;
  period: string;
  generating: string | null;
  onClick: (period: string) => void;
}) {
  const isGenerating = generating === period;
  return (
    <button
      onClick={() => onClick(period)}
      disabled={generating !== null}
      className={`flex flex-col items-center gap-2 p-4 rounded-btn border transition-colors
        ${generating !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-light hover:border-accent/30'}
        bg-surface-dark border-white/10`}
    >
      {isGenerating ? (
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      ) : (
        <Download className="w-6 h-6 text-accent" />
      )}
      <span className="text-sm text-gray-200">{label}</span>
      <span className="text-xs text-gray-500">{isGenerating ? 'Generando...' : 'Descargar PDF'}</span>
    </button>
  );
}
