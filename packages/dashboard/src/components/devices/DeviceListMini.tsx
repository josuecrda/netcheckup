import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import StatusDot from '../common/StatusDot';
import DeviceIcon from '../common/DeviceIcon';
import { useDevices } from '../../hooks/useDevices';

export default function DeviceListMini() {
  const { data: devices } = useDevices();
  const navigate = useNavigate();

  const list = (devices ?? []).slice(0, 8);

  return (
    <Card padding={false}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <p className="text-sm text-gray-400">Dispositivos</p>
        <button
          onClick={() => navigate('/devices')}
          className="text-xs text-accent hover:text-accent-hover"
        >
          Ver todos
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-gray-500 text-sm px-5 pb-4">Sin dispositivos detectados</p>
      ) : (
        <div className="divide-y divide-white/5">
          {list.map((d) => (
            <div
              key={d.id}
              className="px-5 py-2.5 flex items-center gap-3 hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => navigate(`/devices?selected=${d.id}`)}
            >
              <DeviceIcon type={d.deviceType} className="w-4 h-4 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">
                  {d.customName || d.hostname || d.ipAddress}
                </p>
                <p className="text-xs text-gray-500">{d.ipAddress}</p>
              </div>
              <StatusDot status={d.status} />
              {d.latencyMs != null && (
                <span className="text-xs text-gray-500">{d.latencyMs.toFixed(0)}ms</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
