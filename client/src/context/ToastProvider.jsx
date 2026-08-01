import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { ToastContext } from "./ToastContext";

const DEFAULT_DURATION_MS = 4000;
// Errors stay long enough to be read and acted on; a 4 s error is a flash the
// user notices only after it has gone.
const ERROR_DURATION_MS = 7000;

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, { type = "info", duration } = {}) => {
      if (!message) return null;

      const id = ++nextId;
      const lifetime =
        duration ?? (type === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);

      setToasts((current) => {
        // Repeating the same message (a retry loop, a rapid double-click)
        // should refresh the existing toast rather than stack duplicates.
        const withoutDuplicate = current.filter(
          (toast) => toast.message !== message
        );
        return [...withoutDuplicate, { id, message, type }];
      });

      const timer = setTimeout(() => dismiss(id), lifetime);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      toast: push,
      success: (message, options) => push(message, { ...options, type: "success" }),
      error: (message, options) => push(message, { ...options, type: "error" }),
      warning: (message, options) => push(message, { ...options, type: "warning" }),
      info: (message, options) => push(message, { ...options, type: "info" }),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/90 dark:text-emerald-100",
    iconClassName: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: XCircle,
    className:
      "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/90 dark:text-rose-100",
    iconClassName: "text-rose-600 dark:text-rose-400",
  },
  warning: {
    icon: AlertTriangle,
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/90 dark:text-amber-100",
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  info: {
    icon: Info,
    className:
      "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800/80 dark:bg-sky-950/90 dark:text-sky-100",
    iconClassName: "text-sky-600 dark:text-cyan-400",
  },
};

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      // Anchored bottom-centre on phones (thumb reach, no overlap with the
      // header) and bottom-right from sm up. Non-interactive by default so it
      // never blocks the page underneath; each toast re-enables its own events.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:bottom-5 sm:end-5 sm:items-end"
      // Status changes are announced without stealing focus from the control
      // that caused them.
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
        const Icon = style.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl shadow-slate-900/10 backdrop-blur-sm ${style.className}`}
          >
            <Icon
              size={18}
              className={`mt-0.5 shrink-0 ${style.iconClassName}`}
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 break-words text-xs font-bold leading-relaxed">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="-me-1 shrink-0 rounded-lg p-1 opacity-60 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
              aria-label="Dismiss notification"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastProvider;
