// Metadata + aggregation helpers for AI-estimated food health labels and
// taste profiling. Labels themselves are produced at upload time by the AI.

export const HEALTH_META = {
  "high-calorie": { icon: "🔥", label: "High calorie", tone: "rose" },
  "high-sugar":   { icon: "🍬", label: "High sugar",   tone: "mauve" },
  "high-sodium":  { icon: "🧂", label: "High sodium",  tone: "slate" },
  "high-fat":     { icon: "🧈", label: "High fat",     tone: "rose" },
  "fried":        { icon: "🍳", label: "Fried",        tone: "mauve" },
  "processed":    { icon: "🏭", label: "Processed",    tone: "slate" },
  "healthy":      { icon: "🥗", label: "Healthy",      tone: "ink" },
  "high-protein": { icon: "💪", label: "High protein", tone: "ink" },
};

// Tailwind classes per tone (kept here so badges stay on-palette).
export const TONE_CLASSES = {
  rose:  "bg-rose/30 text-ink border-rose/50",
  mauve: "bg-mauve/20 text-ink border-mauve/40",
  slate: "bg-slate/10 text-ink border-slate/30",
  ink:   "bg-ink/8 text-ink border-ink/20",
};

export const TASTE_META = {
  sweet:  "🍯",
  savory: "🍖",
  spicy:  "🌶️",
  sour:   "🍋",
  umami:  "🍄",
  salty:  "🧂",
};

const flatItems = (receipts) => receipts.flatMap((r) => (Array.isArray(r.items) ? r.items : []));

/** Count of each health label across every item. Sorted desc. */
export function healthSummary(receipts) {
  const counts = {};
  for (const it of flatItems(receipts)) {
    for (const lbl of it?.health_labels || []) {
      counts[lbl] = (counts[lbl] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count, ...HEALTH_META[label] }))
    .filter((x) => x.icon) // ignore unknown labels
    .sort((a, b) => b.count - a.count);
}

/** Dominant taste tags across all items, sorted desc. */
export function tasteProfile(receipts) {
  const counts = {};
  for (const it of flatItems(receipts)) {
    for (const t of it?.taste_tags || []) counts[t] = (counts[t] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([taste, count]) => ({ taste, count, icon: TASTE_META[taste] }))
    .filter((x) => x.icon)
    .sort((a, b) => b.count - a.count);
}

/** Alcoholic vs non-alcoholic drink counts. */
export function drinkSplit(receipts) {
  let alcoholic = 0, nonAlcoholic = 0;
  for (const it of flatItems(receipts)) {
    if (it?.kind === "drink") {
      if (it.alcoholic) alcoholic++;
      else nonAlcoholic++;
    }
  }
  return { alcoholic, nonAlcoholic, total: alcoholic + nonAlcoholic };
}

/** True if a receipt contains any item flagged high-calorie or high-sugar. */
export function hasHealthAlert(receipt) {
  return (receipt.items || []).some((it) =>
    (it?.health_labels || []).some((l) => l === "high-calorie" || l === "high-sugar")
  );
}
