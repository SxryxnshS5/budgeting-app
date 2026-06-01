// Shared palette + tooltip for all Recharts visuals so they stay on-brand.
export const PALETTE = {
  ink: "#22223B",
  slate: "#4A4E69",
  mauve: "#9A8C98",
  rose: "#C9ADA7",
  cream: "#F2E9E4",
};

// Ordered colours for multi-series charts (donut slices, bars).
export const SERIES = ["#22223B", "#4A4E69", "#9A8C98", "#C9ADA7", "#B7A6AE", "#8B8196"];

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

/** Themed tooltip card used across charts. */
export function ChartTooltip({ active, payload, label, valuePrefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/60 bg-ink/95 px-3 py-2 text-xs text-cream shadow-lift backdrop-blur">
      {label != null && <p className="mb-1 font-semibold">{label}</p>}
      {payload
        .filter((p) => p.value != null)
        .map((p, i) => (
          <p key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
            <span className="text-cream/70">{valuePrefix || p.name}:</span>
            <span className="font-semibold">{fmt(p.value)}</span>
          </p>
        ))}
    </div>
  );
}
