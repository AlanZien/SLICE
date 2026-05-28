/**
 * Top-right toast system: a single React provider that owns the queue and a
 * `useToast()` hook for anywhere in the tree to `push({ variant, message })`.
 *
 * Variants:
 * - `success` — `role=status` (polite live region), auto-dismiss after 4 s
 * - `error`   — `role=alert`  (assertive live region), auto-dismiss after 6 s
 *
 * Animation: slide-in from the right with a short translate + fade. The
 * provider is intentionally minimal — anything richer (stacking, manual
 * dismiss) can come later without breaking the surface.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error';

export interface ToastInput {
  variant: ToastVariant;
  message: string;
}

interface ToastState extends ToastInput {
  id: number;
}

interface ToastContextValue {
  push: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS: Record<ToastVariant, number> = {
  success: 4000,
  error: 6000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const push = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...input, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, DURATION_MS[toast.variant]);
    return () => clearTimeout(timer);
  }, [toast.variant, onDismiss]);

  const role = toast.variant === 'error' ? 'alert' : 'status';
  const colorClass =
    toast.variant === 'error'
      ? 'bg-red-600 text-white'
      : 'bg-emerald-600 text-white';

  return (
    <div
      role={role}
      className={`pointer-events-auto rounded-lg px-4 py-2 text-sm shadow-lg ${colorClass} motion-safe:animate-[slide-in-right_200ms_ease-out]`}
    >
      {toast.message}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside a <ToastProvider>.');
  }
  return ctx;
}
