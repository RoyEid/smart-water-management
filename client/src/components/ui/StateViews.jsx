import { AlertCircle, Inbox, LoaderCircle, RefreshCw, WifiOff } from "lucide-react";

/**
 * The four states every data-backed panel in this app can be in: loading,
 * failed, empty, and offline. Centralised so a new page cannot invent a fifth
 * visual language for "nothing to show".
 */

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70 ${className}`}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton({ rows = 3 }) {
  return (
    <div
      className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
      // The surrounding region announces "loading"; the bars themselves are
      // decorative and must not be read out one by one.
      aria-hidden="true"
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <div className="mt-5 space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={`h-10 ${columnIndex === 0 ? "flex-[2]" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        size={26}
        className="animate-spin text-blue-600 dark:text-cyan-400"
        aria-hidden="true"
      />
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <span className="grid size-12 place-items-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
        <Icon size={22} aria-hidden="true" />
      </span>
      <div className="max-w-sm">
        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
          {title}
        </p>
        {description && (
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry, retryLabel = "Try again" }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/70 px-6 py-12 text-center dark:border-rose-900/60 dark:bg-rose-950/30"
      role="alert"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-white text-rose-500 ring-1 ring-rose-200 dark:bg-slate-900 dark:ring-rose-900/60">
        <AlertCircle size={22} aria-hidden="true" />
      </span>
      <p className="max-w-md text-xs font-bold leading-relaxed text-rose-900 dark:text-rose-200">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/50 dark:focus-visible:ring-rose-900/40"
        >
          <RefreshCw size={14} aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Distinct from ErrorState on purpose: "the backend is unreachable" is a
 * different situation from "the request failed", and conflating them tells the
 * user to retry when the real fix is to start the server.
 */
export function OfflineState({ message, onRetry, retryLabel = "Retry" }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-amber-200 bg-amber-50/70 px-6 py-12 text-center dark:border-amber-900/60 dark:bg-amber-950/30"
      role="alert"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-white text-amber-600 ring-1 ring-amber-200 dark:bg-slate-900 dark:ring-amber-900/60">
        <WifiOff size={22} aria-hidden="true" />
      </span>
      <p className="max-w-md text-xs font-bold leading-relaxed text-amber-900 dark:text-amber-200">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-xs font-bold text-amber-800 shadow-sm transition hover:bg-amber-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-950/50 dark:focus-visible:ring-amber-900/40"
        >
          <RefreshCw size={14} aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
