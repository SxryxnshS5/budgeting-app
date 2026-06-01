import { useEffect, useMemo, useState } from "react";
import { getInsights, getReceipts } from "../services/api";

const fmtMoney = (n) => `$${(n || 0).toFixed(2)}`;

function computeStats(receipts) {
  const total   = receipts.reduce((s, r) => s + (r.total_amount || 0), 0);
  const count   = receipts.length;
  const average = count ? total / count : 0;

  const byCategory = {};
  const byStore    = {};
  let itemCount    = 0;

  for (const r of receipts) {
    const cat = r.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + (r.total_amount || 0);
    if (r.store_name)
      byStore[r.store_name] = (byStore[r.store_name] || 0) + (r.total_amount || 0);
    if (Array.isArray(r.items)) itemCount += r.items.length;
  }

  const categories = Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const stores = Object.entries(byStore)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { total, count, average, categories, stores, itemCount };
}

/* ── Segmented toggle ───────────────────────────────────────────── */
function ModeToggle({ mode, setMode }) {
  const isFood = mode === "food";
  return (
    <div className="relative mx-auto mb-10 grid w-full max-w-sm grid-cols-2 rounded-full border border-white/60 bg-white/55 p-1 shadow-soft backdrop-blur">
      <span
        className="absolute inset-y-1 w-1/2 rounded-full bg-ink shadow-lift transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: isFood ? "translateX(0%)" : "translateX(100%)" }}
      />
      {[
        { key: "food",      label: "🍴 Food" },
        { key: "financial", label: "💰 Financial" },
      ].map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setMode(key)}
          className={`relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300 ${
            mode === key ? "text-cream" : "text-slate hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent = "bg-mauve" }) {
  return (
    <div className="glass group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className={`h-1 w-full ${accent} opacity-60`} />
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-mauve">{label}</p>
        <p className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Bar row ────────────────────────────────────────────────────── */
function BarRow({ name, amount, max, total, rank, barColor }) {
  const pct     = max ? Math.round((amount / max) * 100) : 0;
  const sharePct = total ? Math.round((amount / total) * 100) : 0;
  return (
    <div className="group/bar">
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/6 text-[10px] font-bold text-slate">
            {rank}
          </span>
          <span className="truncate font-medium text-ink capitalize">{name}</span>
        </div>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="text-xs font-medium text-mauve">{sharePct}%</span>
          <span className="font-semibold text-slate">{fmtMoney(amount)}</span>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-cream/80">
        <div
          className={`h-full origin-left rounded-full ${barColor} transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Food panel ─────────────────────────────────────────────────── */
function FoodInsights({ stats }) {
  const maxCat   = stats.categories[0]?.amount || 1;
  const topStore = stats.stores[0];

  return (
    <div className="space-y-8 stagger">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Items logged"  value={stats.itemCount}          accent="bg-rose" />
        <StatCard label="Receipts"      value={stats.count}              accent="bg-mauve" />
        <StatCard label="Categories"    value={stats.categories.length}  accent="bg-slate" />
      </div>

      <div className="glass p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-bold text-ink">Spending by category</h2>
          <span className="rounded-full bg-ink/6 px-3 py-0.5 text-xs font-medium text-slate">
            {stats.categories.length} categories
          </span>
        </div>
        <div className="space-y-5">
          {stats.categories.map((c, i) => (
            <BarRow
              key={c.name}
              rank={i + 1}
              name={c.name}
              amount={c.amount}
              max={maxCat}
              total={stats.total}
              barColor="bg-gradient-to-r from-mauve to-rose"
            />
          ))}
        </div>
        {topStore && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/60 bg-white/50 px-4 py-3">
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-xs text-mauve">Top merchant</p>
              <p className="text-sm font-semibold text-ink">
                {topStore.name}{" "}
                <span className="font-normal text-slate">({fmtMoney(topStore.amount)})</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Financial panel ────────────────────────────────────────────── */
function FinancialInsights({ stats, insights }) {
  const maxStore = stats.stores[0]?.amount || 1;

  return (
    <div className="space-y-8 stagger">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total spent"
          value={fmtMoney(stats.total)}
          sub={`across ${stats.count} receipts`}
          accent="bg-ink"
        />
        <StatCard label="Avg / receipt" value={fmtMoney(stats.average)} accent="bg-slate" />
        <StatCard label="Receipts"      value={stats.count}             accent="bg-mauve" />
      </div>

      {stats.stores.length > 0 && (
        <div className="glass p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold text-ink">Spending by merchant</h2>
            <span className="rounded-full bg-ink/6 px-3 py-0.5 text-xs font-medium text-slate">
              {stats.stores.length} merchants
            </span>
          </div>
          <div className="space-y-5">
            {stats.stores.slice(0, 6).map((s, i) => (
              <BarRow
                key={s.name}
                rank={i + 1}
                name={s.name}
                amount={s.amount}
                max={maxStore}
                total={stats.total}
                barColor="bg-gradient-to-r from-slate to-mauve"
              />
            ))}
          </div>
        </div>
      )}

      {insights?.insights && (
        <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-ink p-6 text-cream shadow-lift">
          {/* Decorative blob */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-mauve/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-rose/15 blur-2xl" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm">🤖</span>
              <h2 className="font-bold text-cream">AI Analysis</h2>
              <span className="ml-auto rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-widest text-cream/70 uppercase">
                GPT-4o
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream/80">
              {insights.insights}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function InsightsPage() {
  const [receipts, setReceipts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [status,   setStatus]   = useState("loading");
  const [mode,     setMode]     = useState("food");

  useEffect(() => {
    Promise.all([getReceipts(), getInsights()])
      .then(([r, i]) => { setReceipts(r.data); setInsights(i.data); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, []);

  const stats = useMemo(() => computeStats(receipts), [receipts]);

  if (status === "loading") {
    return (
      <div className="animate-fade-up space-y-6">
        <div className="skeleton mx-auto h-10 w-56 rounded-full" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-sm py-20 text-center animate-fade-up">
        <div className="glass mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">⚠️</div>
        <p className="font-semibold text-ink">Couldn't load insights</p>
        <p className="mt-1 text-sm text-mauve">Is the backend running?</p>
      </div>
    );
  }

  if (stats.count === 0) {
    return (
      <div className="mx-auto max-w-sm py-20 text-center animate-fade-up">
        <div className="glass mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-lift">
          📊
        </div>
        <h1 className="mb-2 text-2xl font-extrabold text-ink">No data yet</h1>
        <p className="text-slate">Upload some receipts to unlock your spending insights.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Spending Insights</h1>
        <p className="mt-1.5 text-sm text-mauve">
          Based on {stats.count} receipt{stats.count !== 1 ? "s" : ""} · {fmtMoney(stats.total)} total
        </p>
      </div>

      <ModeToggle mode={mode} setMode={setMode} />

      <div key={mode} className="animate-fade-up">
        {mode === "food"
          ? <FoodInsights stats={stats} />
          : <FinancialInsights stats={stats} insights={insights} />
        }
      </div>
    </div>
  );
}
