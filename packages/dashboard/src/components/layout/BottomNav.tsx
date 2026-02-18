import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Monitor, Gauge, Bell, Wrench, Settings } from 'lucide-react';
import { useUnreadAlertCount } from '../../hooks/useAlerts';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/devices', icon: Monitor, label: 'Equipos' },
  { to: '/speed-test', icon: Gauge, label: 'Speed' },
  { to: '/alerts', icon: Bell, label: 'Alertas' },
  { to: '/tools', icon: Wrench, label: 'Tools' },
  { to: '/settings', icon: Settings, label: 'Config' },
];

export default function BottomNav() {
  const { data: unread } = useUnreadAlertCount();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-white/5 z-50">
      <div className="flex justify-around">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-3 text-xs transition-colors relative ${
                isActive ? 'text-accent' : 'text-gray-400'
              }`
            }
          >
            <link.icon className="w-5 h-5 mb-0.5" />
            <span>{link.label}</span>
            {link.to === '/alerts' && unread && unread.count > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unread.count > 9 ? '9+' : unread.count}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
