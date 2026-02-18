import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useDevices } from '../../hooks/useDevices';
import DeviceIcon from '../common/DeviceIcon';

interface DeviceSelectorProps {
  /** Current value (IP, MAC, or hostname) */
  value: string;
  onChange: (value: string) => void;
  /** What field to use: 'ip' for ping/traceroute/port-scan, 'mac' for WoL */
  mode?: 'ip' | 'mac';
  placeholder?: string;
  className?: string;
}

export default function DeviceSelector({
  value,
  onChange,
  mode = 'ip',
  placeholder = 'Host o IP',
  className = '',
}: DeviceSelectorProps) {
  const { data: devices } = useDevices();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = (devices ?? []).filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.ipAddress.includes(q) ||
      d.macAddress.toLowerCase().includes(q) ||
      (d.hostname?.toLowerCase().includes(q) ?? false) ||
      (d.customName?.toLowerCase().includes(q) ?? false) ||
      (d.vendor?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleSelect = (deviceValue: string) => {
    onChange(deviceValue);
    setOpen(false);
    setSearch('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    // If user types, also update search filter
    setSearch(v);
    if (v && !open) setOpen(true);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-surface-light border border-white/10 rounded-l-btn px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent font-mono"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            if (!open) setSearch('');
          }}
          className="bg-surface-light border border-l-0 border-white/10 rounded-r-btn px-2 text-gray-400 hover:text-gray-200 transition-colors"
          title="Seleccionar dispositivo"
        >
          {value ? (
            <X className="w-4 h-4" onClick={(e) => { e.stopPropagation(); handleClear(); }} />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {open && (devices?.length ?? 0) > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-white/10 rounded-lg shadow-xl max-h-60 overflow-hidden">
          {/* Search inside dropdown */}
          <div className="p-2 border-b border-white/5">
            <div className="flex items-center gap-2 bg-surface-light rounded px-2 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar dispositivo..."
                className="bg-transparent text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none flex-1 min-w-0"
                autoFocus
              />
            </div>
          </div>

          {/* Device list */}
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-500 p-3 text-center">Sin resultados</p>
            ) : (
              filtered.map((d) => {
                const displayValue = mode === 'mac' ? d.macAddress : d.ipAddress;
                const name = d.customName || d.hostname || d.ipAddress;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelect(displayValue)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                  >
                    <DeviceIcon type={d.deviceType} className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-200 truncate">{name}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {mode === 'mac' ? d.macAddress : d.ipAddress}
                        {d.vendor ? ` · ${d.vendor}` : ''}
                      </p>
                    </div>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      d.status === 'online' ? 'bg-emerald-400' :
                      d.status === 'degraded' ? 'bg-amber-400' : 'bg-gray-600'
                    }`} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
