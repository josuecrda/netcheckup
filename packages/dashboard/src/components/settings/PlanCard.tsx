import { useState } from 'react';
import { Crown, Check, X, KeyRound, Zap, Shield } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useLicense, useTiers, useActivateLicense, useDeactivateLicense } from '../../hooks/useLicense';
import { TIER_LABELS, TIER_PRICES } from '@netcheckup/shared';
import type { LicenseTier } from '@netcheckup/shared';

const TIER_ICONS: Record<LicenseTier, React.ReactNode> = {
  free: <Zap className="w-5 h-5" />,
  monitoring: <Shield className="w-5 h-5" />,
  consulting: <Crown className="w-5 h-5" />,
};

const TIER_COLORS: Record<LicenseTier, string> = {
  free: 'text-gray-400 border-white/10',
  monitoring: 'text-accent border-accent/30',
  consulting: 'text-amber-400 border-amber-400/30',
};

const TIER_FEATURES: Record<LicenseTier, string[]> = {
  free: [
    '1 escaneo de red por día',
    'Últimas 24 hrs de datos',
    'Health Score básico',
    'Alertas in-app',
    'Herramientas de red',
  ],
  monitoring: [
    'Escaneos ilimitados',
    'Historial completo de datos',
    'Monitoreo 24/7',
    'Alertas por Email y Telegram',
    'Reportes PDF',
    'Herramientas de red',
  ],
  consulting: [
    'Todo de Monitoreo',
    'SNMP avanzado',
    'Multi-sede (próximamente)',
    'White-label (próximamente)',
    'Soporte prioritario',
  ],
};

export default function PlanCard() {
  const { data: license, isLoading } = useLicense();
  const { data: tiers } = useTiers();
  const activateMutation = useActivateLicense();
  const deactivateMutation = useDeactivateLicense();

  const [showActivate, setShowActivate] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');

  if (isLoading || !license) return null;

  const currentTier = license.tier;

  const handleActivate = () => {
    setError('');
    activateMutation.mutate(keyInput.trim(), {
      onSuccess: () => {
        setShowActivate(false);
        setKeyInput('');
      },
      onError: (err: Error) => {
        setError(err.message);
      },
    });
  };

  const handleDeactivate = () => {
    deactivateMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Plan actual */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${TIER_COLORS[currentTier]}`}>
              {TIER_ICONS[currentTier]}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-300">Plan Actual</p>
              <p className={`text-lg font-bold ${currentTier === 'free' ? 'text-gray-200' : currentTier === 'monitoring' ? 'text-accent' : 'text-amber-400'}`}>
                {TIER_LABELS[currentTier]}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {TIER_PRICES[currentTier].label}
            </p>
            {currentTier !== 'free' && license.activatedAt && (
              <p className="text-xs text-gray-600 mt-1">
                Desde {new Date(license.activatedAt).toLocaleDateString('es-MX')}
              </p>
            )}
          </div>
        </div>

        {/* Límites activos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
          <div className="bg-surface-dark rounded-lg p-3">
            <span className="text-gray-500 text-xs">Escaneos/día</span>
            <p className="text-gray-200 font-medium">
              {license.limits.scansPerDay === -1 ? 'Ilimitados' : license.limits.scansPerDay}
            </p>
          </div>
          <div className="bg-surface-dark rounded-lg p-3">
            <span className="text-gray-500 text-xs">Retención datos</span>
            <p className="text-gray-200 font-medium">
              {license.limits.dataRetentionHours === -1 ? 'Ilimitada' : `${license.limits.dataRetentionHours} hrs`}
            </p>
          </div>
          <div className="bg-surface-dark rounded-lg p-3">
            <span className="text-gray-500 text-xs">Alertas Email</span>
            <p className={`font-medium ${license.limits.emailAlerts ? 'text-emerald-400' : 'text-gray-600'}`}>
              {license.limits.emailAlerts ? 'Activas' : 'No disponible'}
            </p>
          </div>
          <div className="bg-surface-dark rounded-lg p-3">
            <span className="text-gray-500 text-xs">Reportes PDF</span>
            <p className={`font-medium ${license.limits.pdfReports ? 'text-emerald-400' : 'text-gray-600'}`}>
              {license.limits.pdfReports ? 'Activos' : 'No disponible'}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          {currentTier === 'free' ? (
            <Button
              icon={<KeyRound className="w-4 h-4" />}
              onClick={() => setShowActivate(true)}
            >
              Activar Licencia
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleDeactivate} loading={deactivateMutation.isPending}>
              Desactivar licencia
            </Button>
          )}
        </div>
      </Card>

      {/* Modal de activación */}
      {showActivate && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <KeyRound className="w-5 h-5 text-accent" />
            <p className="text-sm font-medium text-gray-300">Activar Licencia</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Clave de licencia</label>
              <input
                type="text"
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setError(''); }}
                placeholder="NC-M-XXXXXXXX-XXXXXXXX"
                className="w-full bg-surface-dark border border-white/10 rounded-btn px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors font-mono tracking-wider"
                autoFocus
              />
              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleActivate} loading={activateMutation.isPending} disabled={!keyInput.trim()}>
                Activar
              </Button>
              <Button variant="ghost" onClick={() => { setShowActivate(false); setKeyInput(''); setError(''); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Comparación de planes */}
      <Card>
        <p className="text-sm font-medium text-gray-300 mb-4">Comparar Planes</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['free', 'monitoring', 'consulting'] as LicenseTier[]).map((tier) => (
            <div
              key={tier}
              className={`rounded-xl border p-4 transition-colors ${
                tier === currentTier
                  ? `${TIER_COLORS[tier]} bg-surface-dark`
                  : 'border-white/5 bg-surface-dark/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={TIER_COLORS[tier]}>{TIER_ICONS[tier]}</span>
                <span className="text-sm font-bold text-gray-200">{TIER_LABELS[tier]}</span>
              </div>
              <p className="text-lg font-bold text-white mb-3">
                {TIER_PRICES[tier].label}
              </p>
              <ul className="space-y-1.5">
                {TIER_FEATURES[tier].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-gray-400">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              {tier === currentTier && (
                <div className="mt-3 text-xs text-accent font-medium">Plan actual</div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
