/**
 * Versatile card for AI tips, cost-cutting swaps, and taste recommendations.
 * @param icon emoji
 * @param title heading
 * @param subtitle muted line under title (optional)
 * @param body main text
 * @param badge optional pill text on the right (e.g. "Save $40/mo")
 */
export default function RecommendationCard({ icon, title, subtitle, body, badge }) {
  return (
    <div className="glass flex gap-4 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink/6 text-xl">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-ink">{title}</p>
          {badge && (
            <span className="shrink-0 rounded-full bg-rose/30 px-2.5 py-0.5 text-[11px] font-semibold text-ink">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-xs font-medium capitalize text-mauve">{subtitle}</p>}
        {body && <p className="mt-1 text-sm leading-relaxed text-slate">{body}</p>}
      </div>
    </div>
  );
}
