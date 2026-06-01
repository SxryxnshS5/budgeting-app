/** Personalized hero card describing the user's food persona. */
export default function PersonaCard({ persona }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-ink p-6 text-cream shadow-lift sm:p-8">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-mauve/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-rose/20 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/10 text-5xl shadow-soft backdrop-blur">
          {persona.emoji}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cream/60">
            Your food persona
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {persona.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream/80">
            {persona.blurb}
          </p>

          {persona.highlights?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {persona.highlights.map((h) => (
                <span
                  key={h.label}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs backdrop-blur"
                >
                  <span className="text-cream/60">{h.label}: </span>
                  <span className="font-semibold capitalize">{h.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
