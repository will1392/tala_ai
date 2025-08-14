import React, { createContext, useContext, useCallback, useState } from "react";
import { X } from "lucide-react";

type ToastKind = "info" | "success" | "warning" | "error";

export type Toast = { 
  id: string; 
  title?: string; 
  message: string; 
  kind?: ToastKind; 
  action?: { 
    label: string; 
    onClick: () => void 
  } 
};

type Ctx = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id"> & { id?: string }) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(list => list.filter(t => t.id !== id));
  }, []);

  const push: Ctx["push"] = useCallback((t) => {
    const id = t.id ?? crypto.randomUUID();
    setToasts(list => [...list, { id, kind: "info", ...t }]);
    // auto-dismiss after 6s unless it has an action
    if (!t.action) {
      setTimeout(() => dismiss(id), 6000);
    }
  }, [dismiss]);

  const clear = useCallback(() => setToasts([]), []);

  return (
    <ToastCtx.Provider value={{ toasts, push, dismiss, clear }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const getAriaRole = (kind: ToastKind) => {
    return kind === 'error' || kind === 'warning' ? 'alert' : 'status';
  };
  
  const getAriaLive = (kind: ToastKind) => {
    return kind === 'error' || kind === 'warning' ? 'assertive' : 'polite';
  };
  
  return (
    <div 
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(420px,calc(100vw-2rem))]"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role={getAriaRole(t.kind || 'info')}
          aria-live={getAriaLive(t.kind || 'info')}
          aria-atomic="true"
          className={`rounded-xl border px-4 py-3 shadow-lg backdrop-blur bg-white/95 dark:bg-gray-800/95 border-gray-200 dark:border-gray-700 animate-[toast-in_200ms_ease-out] motion-reduce:animate-none`}
        >
          <div className="flex items-start gap-3">
            <div 
              className={
                t.kind === "error" ? "text-red-400" :
                t.kind === "warning" ? "text-yellow-400" :
                t.kind === "success" ? "text-green-400" : "text-gray-500 dark:text-gray-400"
              }
              aria-hidden="true"
            >●</div>
            <div className="flex-1">
              {t.title ? <div className="font-semibold mb-0.5 text-gray-900 dark:text-white">{t.title}</div> : null}
              <div className="text-sm text-gray-700 dark:text-gray-300">{t.message}</div>
              {t.action && (
                <button
                  onClick={t.action.onClick}
                  className="mt-2 text-sm underline underline-offset-2 text-primary hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label={t.action.label}
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button 
              onClick={() => onDismiss(t.id)} 
              aria-label={`Dismiss ${t.title || 'notification'}`}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <X size={16} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}