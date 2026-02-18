import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, X } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────
type ToastType = 'loading' | 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // ms, 0 = manual dismiss
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => string;
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
  removeToast: (id: string) => void;
}

// ─── Context ───────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── Provider ──────────────────────────────────────────────
let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, updateToast, removeToast }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Toast Item ────────────────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  // Auto-dismiss after duration (default 3s for success/error)
  useEffect(() => {
    const duration = toast.duration ?? (toast.type === 'loading' ? 0 : 3000);
    if (duration > 0) {
      const t = setTimeout(onDismiss, duration);
      return () => clearTimeout(t);
    }
  }, [toast.type, toast.duration, onDismiss]);

  const config = {
    loading: {
      icon: <Loader2 className="w-4 h-4 text-accent animate-spin" />,
      bg: 'bg-surface border-accent/30',
      text: 'text-gray-200',
    },
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      bg: 'bg-surface border-emerald-400/30',
      text: 'text-emerald-300',
    },
    error: {
      icon: <XCircle className="w-4 h-4 text-red-400" />,
      bg: 'bg-surface border-red-400/30',
      text: 'text-red-300',
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg shadow-black/30
        ${config.bg} animate-slide-in min-w-[220px] max-w-[320px]`}
    >
      {config.icon}
      <span className={`text-sm font-medium flex-1 ${config.text}`}>
        {toast.message}
      </span>
      {toast.type !== 'loading' && (
        <button
          onClick={onDismiss}
          className="text-gray-600 hover:text-gray-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
