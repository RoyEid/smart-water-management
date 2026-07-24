const accents = {
  cyan: "bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 ring-cyan-200/60 dark:ring-cyan-800/60 group-hover:bg-cyan-500 group-hover:text-white",
  blue: "bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 ring-blue-200/60 dark:ring-blue-800/60 group-hover:bg-blue-600 group-hover:text-white",
  indigo: "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 ring-indigo-200/60 dark:ring-indigo-800/60 group-hover:bg-indigo-600 group-hover:text-white",
  violet: "bg-violet-50 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 ring-violet-200/60 dark:ring-violet-800/60 group-hover:bg-violet-600 group-hover:text-white",
  amber: "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 ring-amber-200/60 dark:ring-amber-800/60 group-hover:bg-amber-500 group-hover:text-white",
  emerald: "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 ring-emerald-200/60 dark:ring-emerald-800/60 group-hover:bg-emerald-600 group-hover:text-white",
};

export default function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  detail,
  accent = "blue",
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-900/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 truncate text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
            {unit && (
              <span className="ml-1 text-sm font-semibold text-slate-400 dark:text-slate-500">
                {unit}
              </span>
            )}
          </p>
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ${accents[accent]}`}
        >
          <Icon size={19} aria-hidden="true" />
        </span>
      </div>

      {detail && (
        <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100/80 dark:border-slate-800/80 pt-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          <span className="truncate">{detail}</span>
        </div>
      )}
    </article>
  );
}
