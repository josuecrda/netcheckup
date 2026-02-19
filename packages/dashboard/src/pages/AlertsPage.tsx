import { useState } from 'react';
import { Bell, CheckCheck, AlertTriangle, Info, AlertOctagon, Trash2, Shield, Filter } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { useAlerts, useUnreadAlertCount, useMarkAlertRead, useMarkAllAlertsRead } from '../hooks/useAlerts';
import { useToast } from '../components/common/Toast';
import { alertsApi } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ProblemSeverity, AlertType } from '@netcheckup/shared';

const severityIcon: Record<ProblemSeverity, React.ReactNode> = {
  critical: <AlertOctagon className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const severityBadge: Record<ProblemSeverity, 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
};

const typeLabels: Partial<Record<AlertType, string>> = {
  'device-offline': 'Dispositivo offline',
  'device-online': 'Dispositivo en línea',
  'high-latency': 'Alta latencia',
  'packet-loss': 'Pérdida de paquetes',
  'speed-degraded': 'Velocidad degradada',
  'new-device': 'Nuevo dispositivo',
  'problem-detected': 'Problema detectado',
  'problem-resolved': 'Problema resuelto',
};

export default function AlertsPage() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<ProblemSeverity | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data, isLoading } = useAlerts(page, 20, unreadOnly);
  const { data: unreadCount } = useUnreadAlertCount();
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();
  const { addToast } = useToast();
  const qc = useQueryClient();

  const allAlerts = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  // Apply severity filter client-side
  const alerts = severityFilter === 'all'
    ? allAlerts
    : allAlerts.filter((a) => a.severity === severityFilter);

  // Count by severity (from current page data)
  const criticalCount = allAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = allAlerts.filter((a) => a.severity === 'warning').length;
  const infoCount = allAlerts.filter((a) => a.severity === 'info').length;

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      // Second click = confirm delete
      await alertsApi.delete(id);
      qc.invalidateQueries({ queryKey: ['alerts'] });
      addToast({ message: 'Alerta eliminada', type: 'success' });
      setDeletingId(null);
    } else {
      // First click = ask for confirmation
      setDeletingId(id);
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeletingId((prev) => (prev === id ? null : prev)), 3000);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => addToast({ message: 'Todas las alertas marcadas como leídas', type: 'success' }),
    });
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">Alertas</h2>
          {unreadCount && unreadCount.count > 0 && (
            <Badge variant="danger">{unreadCount.count} sin leer</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            {unreadOnly ? 'Ver todas' : 'Solo sin leer'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<CheckCheck className="w-4 h-4" />}
            onClick={handleMarkAllRead}
            loading={markAllRead.isPending}
          >
            Marcar todas leídas
          </Button>
        </div>
      </div>

      {/* Severity filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSeverityFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            severityFilter === 'all'
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-surface-light text-gray-400 border-white/5 hover:text-gray-200'
          }`}
        >
          <Filter className="w-3 h-3" />
          Todas ({allAlerts.length})
        </button>
        {criticalCount > 0 && (
          <button
            onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              severityFilter === 'critical'
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-surface-light text-gray-400 border-white/5 hover:text-red-400'
            }`}
          >
            <AlertOctagon className="w-3 h-3" />
            Críticas ({criticalCount})
          </button>
        )}
        {warningCount > 0 && (
          <button
            onClick={() => setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              severityFilter === 'warning'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-surface-light text-gray-400 border-white/5 hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Advertencias ({warningCount})
          </button>
        )}
        {infoCount > 0 && (
          <button
            onClick={() => setSeverityFilter(severityFilter === 'info' ? 'all' : 'info')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              severityFilter === 'info'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'bg-surface-light text-gray-400 border-white/5 hover:text-blue-400'
            }`}
          >
            <Info className="w-3 h-3" />
            Info ({infoCount})
          </button>
        )}
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        unreadOnly ? (
          <EmptyState
            icon={<CheckCheck className="w-12 h-12 text-emerald-400" />}
            title="Todo en orden"
            description="No hay alertas sin leer. Tu red está funcionando correctamente."
          />
        ) : (
          <EmptyState
            icon={<Bell className="w-12 h-12" />}
            title="Sin alertas"
            description={severityFilter !== 'all' ? 'No hay alertas con este nivel de severidad.' : 'No se han generado alertas.'}
          />
        )
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-white/5">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`px-5 py-4 flex items-start gap-4 transition-colors hover:bg-white/5 ${
                  !alert.readAt ? 'bg-accent/5' : ''
                }`}
              >
                {severityIcon[alert.severity]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-medium text-gray-200">{alert.title}</span>
                    <Badge variant={severityBadge[alert.severity]}>
                      {typeLabels[alert.type] || alert.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">{alert.message}</p>
                  <p
                    className="text-xs text-gray-500 mt-1 cursor-help"
                    title={format(new Date(alert.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                  >
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!alert.readAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead.mutate(alert.id)}
                      title="Marcar como leída"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(alert.id)}
                    title={deletingId === alert.id ? 'Clic para confirmar' : 'Eliminar'}
                  >
                    {deletingId === alert.id ? (
                      <span className="text-[10px] text-red-400 font-medium whitespace-nowrap">Confirmar</span>
                    ) : (
                      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-gray-400">
            Página {page} de {totalPages}
          </span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
