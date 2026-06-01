import { useEffect, useState } from "react";
import { getReceipts } from "../services/api";
import { Link } from "react-router-dom";

const fmtMoney = (n) => (typeof n === "number" ? `$${n.toFixed(2)}` : "—");
const fmtDate  = (ts) => (ts ? new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

const CATEGORY_COLORS = {
  dining:      "bg-mauve/20 text-ink border-mauve/40",
  grocery:     "bg-rose/30 text-ink border-rose/50",
  groceries:   "bg-rose/30 text-ink border-rose/50",
  cafe:        "bg-slate/10 text-ink border-slate/30",
  takeaway:    "bg-ink/8 text-ink border-ink/20",
  default:     "bg-cream text-slate border-mauve/20",
};

const CARD_ACCENT = {
  dining:    "from-mauve/60 to-mauve/20",
  grocery:   "from-rose/70 to-rose/20",
  groceries: "from-rose/70 to-rose/20",
  cafe:      "from-slate/50 to-slate/10",
  takeaway:  "from-ink/40 to-ink/10",
  default:   "from-mauve/30 to-transparent",
};

function categoryPill(cat) {
  const key = cat?.toLowerCase() || "default";
  const cls = CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {cat}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="glass p-5 space-y-3">
      <div className="flex justify-between">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-4 w-16 rounded" />
      </div>
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
    </div>
  );
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [status, setStatus]     = useState("loading");

  useEffect(() => {
    getReceipts()
      .then((res) => { setReceipts(res.data); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading") {
    return (
      <div className="animate-fade-up space-y-6">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-sm py-20 text-center animate-fade-up">
        <div className="glass mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">⚠️</div>
        <p className="font-semibold text-ink">Couldn't load receipts</p>
        <p className="mt-1 text-sm text-mauve">Is the backend running?</p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="mx-auto max-w-sm py-20 text-center animate-fade-up">
        <div className="glass mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-lift">
          🗂️
        </div>
        <h1 className="mb-2 text-2xl font-extrabold text-ink">No receipts yet</h1>
        <p className="mb-6 text-slate">Upload your first receipt to start tracking your food spending.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-semibold text-cream shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
        >
          Upload a receipt →
        </Link>
      </div>
    );
  }

  const total = receipts.reduce((s, r) => s + (r.total_amount || 0), 0);

  return (
    <div className="animate-fade-up space-y-8">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Your Receipts</h1>
          <p className="mt-1 text-sm text-mauve">
            {receipts.length} receipt{receipts.length !== 1 ? "s" : ""} scanned
          </p>
        </div>
        <div className="glass flex items-center gap-4 px-5 py-3">
          <div className="text-right">
            <p className="text-xs font-medium text-mauve">Total spent</p>
            <p className="text-xl font-extrabold tracking-tight text-ink">{fmtMoney(total)}</p>
          </div>
          <div className="h-8 w-px bg-rose/40" />
          <div className="text-right">
            <p className="text-xs font-medium text-mauve">Avg / receipt</p>
            <p className="text-xl font-extrabold tracking-tight text-ink">
              {fmtMoney(total / receipts.length)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 stagger sm:grid-cols-2">
        {receipts.map((r) => {
          const accentKey = r.category?.toLowerCase() || "default";
          const accent = CARD_ACCENT[accentKey] || CARD_ACCENT.default;
          return (
            <div
              key={r.id}
              className="glass group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              {/* Coloured top accent bar */}
              <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />

              <div className="flex flex-1 flex-col p-5">
                {/* Store + amount */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">
                      {r.store_name || "Unknown store"}
                    </p>
                    <p className="mt-0.5 text-xs text-mauve">
                      {r.date || fmtDate(r.uploaded_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold text-slate">{fmtMoney(r.total_amount)}</p>
                  </div>
                </div>

                {/* Category pill */}
                {r.category && (
                  <div className="mt-3">{categoryPill(r.category)}</div>
                )}

                {/* Items */}
                {r.items && r.items.length > 0 && (
                  <>
                    <div className="my-3 border-t border-cream" />
                    <ul className="space-y-1.5 text-sm">
                      {r.items.slice(0, 5).map((item, i) => (
                        <li key={i} className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-slate">
                            {typeof item === "string" ? item : item.name}
                          </span>
                          {item && typeof item === "object" && item.price != null && (
                            <span className="shrink-0 text-xs font-medium text-mauve">
                              {fmtMoney(item.price)}
                            </span>
                          )}
                        </li>
                      ))}
                      {r.items.length > 5 && (
                        <li className="text-xs text-mauve italic">
                          +{r.items.length - 5} more items
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
