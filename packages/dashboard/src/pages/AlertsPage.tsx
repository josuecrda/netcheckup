import { useState } from 'react';
import { Bell, CheckCheck, AlertTriangle, Info, AlertOctagon, Trash2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { useAlerts, useUnreadAlertCount, useMarkAlertRead, useMarkAllAlertsRead } from '../hooks/useAlerts';
import { alertsApi } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
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
  const { data, isLoading } = useAlerts(page, 20, unreadOnly);
  const { data: unreadCount } = useUnreadAlertCount();
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();
  const qc = useQueryClient();

  const alerts = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleDelete = async (id: string) => {
    await alertsApi.delete(id);
    qc.invalidateQueries({ queryKey: ['alerts'] });
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
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
            onClick={() => markAllRead.mutate()}
            loading={markAllRead.isPending}
          >
            Marcar todas leídas
          </Button>
        </div>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-12 h-12" />}
          title="Sin alertas"
          description={unreadOnly ? 'No hay alertas sin leer.' : 'No se han generado alertas.'}
        />
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
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-200">{alert.title}</span>
                    <Badge variant={severityBadge[alert.severity]}>
                      {typeLabels[alert.type] || alert.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
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
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
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
