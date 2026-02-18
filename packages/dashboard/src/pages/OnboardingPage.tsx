import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Building2, Wifi, Gauge, Radar, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import Button from '../components/common/Button';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { scansApi } from '../lib/api';

// ─── Step indicator ──────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? 'w-8 bg-accent'
              : i < current
                ? 'w-2 bg-accent/50'
                : 'w-2 bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step 0: Welcome ─────────────────────────────────────────
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 mb-2">
        <Network className="w-10 h-10 text-accent" />
      </div>
      <h1 className="text-3xl font-bold text-white">Bienvenido a NetCheckup</h1>
      <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
        Tu herramienta de diagnóstico y monitoreo de red. En menos de un minuto configuraremos
        todo para que puedas ver el estado de tu red.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
        <FeatureCard icon={<Radar className="w-5 h-5" />} title="Escaneo automático" desc="Detecta todos los dispositivos" />
        <FeatureCard icon={<Gauge className="w-5 h-5" />} title="Health Score" desc="Calificación de 0-100" />
        <FeatureCard icon={<Wifi className="w-5 h-5" />} title="Diagnóstico" desc="Recomendaciones claras" />
      </div>
      <Button size="lg" onClick={onNext} className="mt-6">
        Comenzar configuración
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-surface border border-white/5 rounded-xl p-4 text-left">
      <div className="text-accent mb-2">{icon}</div>
      <p className="text-sm font-medium text-gray-200">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  );
}

// ─── Step 1: Company info ────────────────────────────────────
function CompanyStep({
  companyName, setCompanyName,
  onNext, onBack,
}: {
  companyName: string;
  setCompanyName: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 mb-4">
          <Building2 className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-white">Tu empresa</h2>
        <p className="text-gray-400 mt-2">Este nombre aparecerá en reportes y el dashboard.</p>
      </div>
      <div className="max-w-sm mx-auto">
        <label className="block text-xs text-gray-500 mb-1.5">Nombre de la empresa</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Ej: Optima Energía"
          className="w-full bg-surface-dark border border-white/10 rounded-btn px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors"
          autoFocus
        />
        <p className="text-xs text-gray-600 mt-2">Puedes cambiarlo después en Configuración.</p>
      </div>
      <div className="flex justify-center gap-3 mt-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
        </Button>
        <Button onClick={onNext}>
          Continuar <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: ISP info ────────────────────────────────────────
function IspStep({
  ispName, setIspName,
  downloadMbps, setDownloadMbps,
  uploadMbps, setUploadMbps,
  onNext, onBack,
}: {
  ispName: string;
  setIspName: (v: string) => void;
  downloadMbps: string;
  setDownloadMbps: (v: string) => void;
  uploadMbps: string;
  setUploadMbps: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 mb-4">
          <Wifi className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-white">Tu internet</h2>
        <p className="text-gray-400 mt-2">Necesitamos esta información para comparar tu velocidad real con la contratada.</p>
      </div>
      <div className="max-w-sm mx-auto space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Proveedor de Internet (ISP)</label>
          <input
            type="text"
            value={ispName}
            onChange={(e) => setIspName(e.target.value)}
            placeholder="Ej: Telmex, Izzi, Totalplay"
            className="w-full bg-surface-dark border border-white/10 rounded-btn px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Descarga contratada (Mbps)</label>
            <input
              type="number"
              value={downloadMbps}
              onChange={(e) => setDownloadMbps(e.target.value)}
              placeholder="Ej: 100"
              className="w-full bg-surface-dark border border-white/10 rounded-btn px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Subida contratada (Mbps)</label>
            <input
              type="number"
              value={uploadMbps}
              onChange={(e) => setUploadMbps(e.target.value)}
              placeholder="Ej: 20"
              className="w-full bg-surface-dark border border-white/10 rounded-btn px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>
        <p className="text-xs text-gray-600">
          Si no conoces tus velocidades contratadas, puedes dejarlo en blanco y configurarlo después.
        </p>
      </div>
      <div className="flex justify-center gap-3 mt-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
        </Button>
        <Button onClick={onNext}>
          Continuar <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Scanning ────────────────────────────────────────
function ScanningStep({ devicesFound, scanDone, onNext }: {
  devicesFound: number;
  scanDone: boolean;
  onNext: () => void;
}) {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 mb-4">
        {scanDone ? (
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        ) : (
          <Radar className="w-7 h-7 text-accent animate-pulse" />
        )}
      </div>
      <h2 className="text-2xl font-bold text-white">
        {scanDone ? '¡Escaneo completado!' : 'Escaneando tu red...'}
      </h2>
      <p className="text-gray-400 max-w-md mx-auto">
        {scanDone
          ? `Se encontraron ${devicesFound} dispositivos en tu red. Todo está listo.`
          : 'Estamos detectando todos los dispositivos conectados a tu red. Esto puede tomar unos segundos...'
        }
      </p>

      {!scanDone && (
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      )}

      {scanDone && (
        <div className="bg-surface border border-white/5 rounded-xl p-5 max-w-xs mx-auto">
          <div className="text-4xl font-bold text-accent">{devicesFound}</div>
          <div className="text-sm text-gray-400 mt-1">dispositivos encontrados</div>
        </div>
      )}

      {scanDone && (
        <Button size="lg" onClick={onNext} className="mt-4">
          Ir al Dashboard <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}

// ─── Main Onboarding Page ────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [step, setStep] = useState(0);
  const totalSteps = 4;

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [ispName, setIspName] = useState('');
  const [downloadMbps, setDownloadMbps] = useState('');
  const [uploadMbps, setUploadMbps] = useState('');

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [devicesFound, setDevicesFound] = useState(0);

  // Pre-fill with existing settings if available
  useEffect(() => {
    if (settings) {
      if (settings.companyName) setCompanyName(settings.companyName);
      if (settings.ispName) setIspName(settings.ispName);
      if (settings.contractedDownloadMbps) setDownloadMbps(String(settings.contractedDownloadMbps));
      if (settings.contractedUploadMbps) setUploadMbps(String(settings.contractedUploadMbps));
    }
  }, [settings]);

  const handleSaveAndScan = async () => {
    // Save settings
    const data: Record<string, unknown> = {
      companyName: companyName || 'Mi Empresa',
      onboardingCompleted: true,
    };
    if (ispName) data.ispName = ispName;
    if (downloadMbps) data.contractedDownloadMbps = Number(downloadMbps);
    if (uploadMbps) data.contractedUploadMbps = Number(uploadMbps);

    updateSettings.mutate(data as any);

    // Trigger network scan
    setScanning(true);
    try {
      await scansApi.triggerDiscovery();
      // Poll for scan completion
      const pollInterval = setInterval(async () => {
        try {
          const scans = await scansApi.latest();
          if (scans && scans.length > 0) {
            const latest = scans[0];
            if (latest.status === 'completed') {
              clearInterval(pollInterval);
              setDevicesFound(latest.devicesFound);
              setScanDone(true);
              setScanning(false);
            }
          }
        } catch {
          // keep polling
        }
      }, 2000);

      // Safety timeout — after 30s, just finish
      setTimeout(() => {
        if (!scanDone) {
          setScanDone(true);
          setScanning(false);
        }
      }, 30000);
    } catch {
      // If scan fails, still mark onboarding as complete
      setScanDone(true);
      setScanning(false);
    }
  };

  const handleFinish = () => {
    navigate('/', { replace: true });
  };

  const goToStep = (nextStep: number) => {
    // When moving to step 3 (scanning), trigger the save + scan
    if (nextStep === 3 && !scanning && !scanDone) {
      handleSaveAndScan();
    }
    setStep(nextStep);
  };

  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <StepIndicator current={step} total={totalSteps} />

        <div className="bg-surface rounded-card border border-white/5 p-8 md:p-10">
          {step === 0 && (
            <WelcomeStep onNext={() => goToStep(1)} />
          )}
          {step === 1 && (
            <CompanyStep
              companyName={companyName}
              setCompanyName={setCompanyName}
              onNext={() => goToStep(2)}
              onBack={() => goToStep(0)}
            />
          )}
          {step === 2 && (
            <IspStep
              ispName={ispName}
              setIspName={setIspName}
              downloadMbps={downloadMbps}
              setDownloadMbps={setDownloadMbps}
              uploadMbps={uploadMbps}
              setUploadMbps={setUploadMbps}
              onNext={() => goToStep(3)}
              onBack={() => goToStep(1)}
            />
          )}
          {step === 3 && (
            <ScanningStep
              devicesFound={devicesFound}
              scanDone={scanDone}
              onNext={handleFinish}
            />
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          NetCheckup v1.0.0 — Diagnóstico de red para PyMEs
        </p>
      </div>
    </div>
  );
}
