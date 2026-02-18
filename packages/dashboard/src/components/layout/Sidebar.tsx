import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Monitor,
  Gauge,
  Bell,
  Wrench,
  Settings,
  Activity,
} from 'lucide-react';
import { useUnreadAlertCount } from '../../hooks/useAlerts';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/devices', icon: Monitor, label: 'Dispositivos' },
  { to: '/speed-test', icon: Gauge, label: 'Speed Test' },
  { to: '/alerts', icon: Bell, label: 'Alertas' },
  { to: '/tools', icon: Wrench, label: 'Herramientas' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

export default function Sidebar() {
  const { data: unread } = useUnreadAlertCount();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-surface border-r border-white/5 h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <Activity className="w-7 h-7 text-accent" />
        <span className="text-lg font-bold">NetCheckup</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
            {link.to === '/alerts' && unread && unread.count > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unread.count > 9 ? '9+' : unread.count}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-white/5 text-xs text-gray-500">
        v0.1.0
      </div>
    </aside>
  );
}
