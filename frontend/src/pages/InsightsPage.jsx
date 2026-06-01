import { useEffect, useMemo, useState } from "react";
import { getInsights, getReceipts } from "../services/api";

const fmtMoney = (n) => `$${(n || 0).toFixed(2)}`;

/** Compute spending insights from the raw receipts. */
function computeStats(receipts) {
  const total = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const count = receipts.length;
  const average = count ? total / count : 0;

  const byCategory = {};
  const byStore = {};
  let itemCount = 0;
  for (const r of receipts) {
    const cat = r.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + (r.total_amount || 0);
    if (r.store_name) {
      byStore[r.store_name] = (byStore[r.store_name] || 0) + (r.total_amount || 0);
    }
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

/** Sliding segmented control that toggles between the two insight modes. */
function ModeToggle({ mode, setMode }) {
  const isFood = mode === "food";
  return (
    <div className="relative mx-auto mb-8 grid w-full max-w-md grid-cols-2 rounded-full border border-white/60 bg-white/50 p-1 shadow-soft backdrop-blur">
      <span
        className="absolute inset-y-1 w-1/2 rounded-full bg-ink shadow-lift transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: isFood ? "translateX(0%)" : "translateX(100%)" }}
      />
      <button
        onClick={() => setMode("food")}
        className={`relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300 ${
          isFood ? "text-cream" : "text-slate hover:text-ink"
        }`}
      >
        🍴 Food Insights
      </button>
      <button
        onClick={() => setMode("financial")}
        className={`relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300 ${
          !isFood ? "text-cream" : "text-slate hover:text-ink"
        }`}
      >
        💰 Financial Insights
      </button>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <p className="text-sm font-medium text-mauve">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{value}</p>
    </div>
  );
}

function BarRow({ name, amount, max, color }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-medium text-ink">{name}</span>
        <span className="text-slate">{fmtMoney(amount)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-cream">
        <div
          className={`h-full origin-left rounded-full ${color} transition-[width] duration-700 ease-out`}
          style={{ width: `${(amount / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

function FoodInsights({ stats }) {
  const maxCat = stats.categories[0]?.amount || 1;
  const topStore = stats.stores[0];
  return (
    <div className="space-y-8 stagger">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Items logged" value={stats.itemCount} />
        <StatCard label="Receipts" value={stats.count} />
        <StatCard label="Categories" value={stats.categories.length} />
      </div>

      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-soft backdrop-blur">
        <h2 className="mb-5 font-semibold text-ink">Spending by category</h2>
        <div className="space-y-4">
          {stats.categories.map((c) => (
            <BarRow key={c.name} name={c.name} amount={c.amount} max={maxCat} color="bg-mauve" />
          ))}
        </div>
        {topStore && (
          <p className="mt-5 border-t border-cream pt-4 text-sm text-slate">
            🏆 Top merchant:{" "}
            <span className="font-semibold text-ink">{topStore.name}</span> (
            {fmtMoney(topStore.amount)})
          </p>
        )}
      </div>
    </div>
  );
}

function FinancialInsights({ stats, insights }) {
  const maxStore = stats.stores[0]?.amount || 1;
  return (
    <div className="space-y-8 stagger">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total spent" value={fmtMoney(stats.total)} />
        <StatCard label="Avg / receipt" value={fmtMoney(stats.average)} />
        <StatCard label="Receipts" value={stats.count} />
      </div>

      {stats.stores.length > 0 && (
        <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-soft backdrop-blur">
          <h2 className="mb-5 font-semibold text-ink">Spending by merchant</h2>
          <div className="space-y-4">
            {stats.stores.slice(0, 6).map((s) => (
              <BarRow key={s.name} name={s.name} amount={s.amount} max={maxStore} color="bg-slate" />
            ))}
          </div>
        </div>
      )}

      {insights?.insights && (
        <div className="rounded-2xl border border-rose/60 bg-rose/25 p-6 shadow-soft backdrop-blur">
          <h2 className="mb-2 font-semibold text-ink">🤖 AI Analysis</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate">
            {insights.insights}
          </p>
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const [receipts, setReceipts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [status, setStatus] = useState("loading"); // 'loading' | 'ready' | 'error'
  const [mode, setMode] = useState("food"); // 'food' | 'financial'

  useEffect(() => {
    Promise.all([getReceipts(), getInsights()])
      .then(([receiptsRes, insightsRes]) => {
        setReceipts(receiptsRes.data);
        setInsights(insightsRes.data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const stats = useMemo(() => computeStats(receipts), [receipts]);

  if (status === "loading") {
    return <p className="py-20 text-center text-mauve">Crunching numbers…</p>;
  }

  if (status === "error") {
    return (
      <p className="py-20 text-center text-rose">
        ❌ Couldn't load insights — is the backend running?
      </p>
    );
  }

  if (stats.count === 0) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center animate-fade-up">
        <div className="mb-4 text-6xl">📊</div>
        <h1 className="mb-2 text-2xl font-extrabold text-ink">Spending Insights</h1>
        <p className="text-slate">Upload some receipts to see your spending insights.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-3xl font-extrabold tracking-tight text-ink">
        Spending Insights
      </h1>

      <ModeToggle mode={mode} setMode={setMode} />

      {/* key forces a fresh fade-up animation each time the mode switches */}
      <div key={mode} className="animate-fade-up">
        {mode === "food" ? (
          <FoodInsights stats={stats} />
        ) : (
          <FinancialInsights stats={stats} insights={insights} />
        )}
      </div>
    </div>
  );
}
