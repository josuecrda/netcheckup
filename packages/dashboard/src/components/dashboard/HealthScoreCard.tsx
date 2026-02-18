import Card from '../common/Card';
import { useHealthScore } from '../../hooks/useHealth';
import type { HealthCategory } from '@netcheckup/shared';

const categoryConfig: Record<HealthCategory, { color: string; bg: string; label: string; emoji: string }> = {
  excellent: { color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5', label: 'Tu red está excelente', emoji: '😊' },
  good: { color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5', label: 'Tu red está bien, con áreas de mejora', emoji: '😐' },
  fair: { color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-500/5', label: 'Tu red necesita atención', emoji: '😟' },
  critical: { color: 'text-red-400', bg: 'from-red-500/20 to-red-500/5', label: 'Tu red tiene problemas críticos', emoji: '😰' },
};

const trendLabels = {
  improving: { text: '↑ Mejorando', color: 'text-emerald-400' },
  stable: { text: '→ Estable', color: 'text-gray-400' },
  declining: { text: '↓ Bajando', color: 'text-red-400' },
};

export default function HealthScoreCard() {
  const { data: health, isLoading } = useHealthScore();

  const category = health?.category || 'good';
  const score = health?.score ?? 0;
  const config = categoryConfig[category];
  const trend = health?.trend || 'stable';
  const trendInfo = trendLabels[trend];

  return (
    <Card className={`bg-gradient-to-br ${config.bg} border-0`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">Salud de la Red</p>
          {isLoading ? (
            <div className="h-12 w-20 bg-white/5 animate-pulse rounded" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${config.color}`}>{score}</span>
                <span className="text-gray-500 text-sm">/100</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">{config.label}</p>
              {health?.previousScore != null && (
                <p className={`text-xs mt-1 ${trendInfo.color}`}>{trendInfo.text}</p>
              )}
            </>
          )}
        </div>
        <span className="text-5xl">{config.emoji}</span>
      </div>

      {/* Factor breakdown */}
      {health?.factors && health.factors.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
          {health.factors.map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{f.name}</span>
                  <span className="text-gray-500">{f.score}/100</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${f.score}%`,
                      backgroundColor:
                        f.score >= 80 ? '#10b981' :
                        f.score >= 60 ? '#f59e0b' :
                        f.score >= 40 ? '#f97316' :
                        '#ef4444',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
