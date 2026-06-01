import { HEALTH_META, TONE_CLASSES } from "../lib/health";

/** Small pill for a single AI-estimated health label. */
export default function HealthBadge({ label }) {
  const meta = HEALTH_META[label];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASSES[meta.tone]}`}
      title="AI-estimated from the item name"
    >
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

/** Shared footnote disclaiming the estimated nature of health labels. */
export function HealthDisclaimer({ className = "" }) {
  return (
    <p className={`text-[11px] italic text-mauve ${className}`}>
      ⓘ Health labels are AI estimates based on item names, not verified nutrition data.
    </p>
  );
}
