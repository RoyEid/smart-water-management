export default function ComingSoonBadge({ collapsed = false }) {
  if (collapsed) {
    return (
      <span className="size-1.5 rounded-full bg-cyan-400 font-bold" title="Coming Soon" />
    );
  }

  return (
    <span className="rounded-full bg-cyan-950/80 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase text-cyan-300 ring-1 ring-cyan-500/30">
      Soon
    </span>
  );
}
