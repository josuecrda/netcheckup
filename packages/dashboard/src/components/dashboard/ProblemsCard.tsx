import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import Card from '../common/Card';
import { useProblems, useResolveProblem } from '../../hooks/useHealth';
import type { Problem, ProblemSeverity } from '@netcheckup/shared';

const severityConfig: Record<ProblemSeverity, { icon: typeof AlertTriangle; color: string; bgColor: string; label: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-400/10', label: 'Cr\u00edtico' },
  warning: { icon: AlertCircle, color: 'text-amber-400', bgColor: 'bg-amber-400/10', label: 'Advertencia' },
  info: { icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-400/10', label: 'Info' },
};

function ProblemItem({ problem }: { problem: Problem }) {
  const resolve = useResolveProblem();
  const config = severityConfig[problem.severity];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-xl ${config.bgColor} border border-white/5`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-gray-200 truncate">{problem.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} flex-shrink-0`}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{problem.description}</p>

          {/* Recommendation */}
          <div className="mt-2 p-2 bg-white/5 rounded-lg">
            <p className="text-xs text-gray-300 font-medium mb-1">Recomendaci\u00f3n:</p>
            <p className="text-xs text-gray-400 whitespace-pre-line line-clamp-3">{problem.recommendation}</p>
          </div>

          {/* Impact */}
          <p className="text-xs text-gray-500 mt-2 italic">{problem.impact}</p>

          {/* Resolve button */}
          <button
            className="text-xs text-emerald-400 hover:text-emerald-300 mt-2 flex items-center gap-1 transition-colors"
            onClick={() => resolve.mutate(problem.id)}
            disabled={resolve.isPending}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {resolve.isPending ? 'Resolviendo...' : 'Marcar como resuelto'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProblemsCard() {
  const { data: problems, isLoading } = useProblems();

  if (isLoading) {
    return (
      <Card>
        <div className="h-32 bg-white/5 animate-pulse rounded" />
      </Card>
    );
  }

  const activeProblems = problems || [];

  if (activeProblems.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-emerald-400">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="text-sm font-medium">Sin problemas detectados</p>
            <p className="text-xs text-gray-500">Tu red est\u00e1 funcionando correctamente</p>
          </div>
        </div>
      </Card>
    );
  }

  // Sort by severity: critical first, then warning, then info
  const sorted = [...activeProblems].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-300">
          Problemas detectados ({activeProblems.length})
        </p>
        <div className="flex gap-2 text-xs">
          {activeProblems.filter(p => p.severity === 'critical').length > 0 && (
            <span className="text-red-400">{activeProblems.filter(p => p.severity === 'critical').length} cr\u00edticos</span>
          )}
          {activeProblems.filter(p => p.severity === 'warning').length > 0 && (
            <span className="text-amber-400">{activeProblems.filter(p => p.severity === 'warning').length} advertencias</span>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {sorted.map((problem) => (
          <ProblemItem key={problem.id} problem={problem} />
        ))}
      </div>
    </Card>
  );
}
