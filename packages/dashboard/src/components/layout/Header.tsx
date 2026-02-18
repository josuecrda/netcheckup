import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/devices': 'Dispositivos',
  '/speed-test': 'Speed Test',
  '/alerts': 'Alertas',
  '/settings': 'Configuración',
};

export default function Header() {
  const location = useLocation();
  const title = titles[location.pathname] || 'NetCheckup';

  return (
    <header className="h-14 flex items-center px-6 border-b border-white/5 bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
