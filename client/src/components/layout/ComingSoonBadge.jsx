/**
 * Marks a navigation entry as not built yet.
 *
 * The label is passed in rather than hardcoded so the badge speaks the user's
 * language along with the rest of the sidebar.
 */
export default function ComingSoonBadge({ collapsed = false, label = "Soon" }) {
  if (collapsed) {
    return (
      <span
        className="size-1.5 shrink-0 rounded-full bg-cyan-400"
        title={label}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-cyan-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-cyan-700 ring-1 ring-cyan-500/30 dark:bg-cyan-950/80 dark:text-cyan-300">
      {label}
    </span>
  );
}
