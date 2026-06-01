import { useEffect, useMemo, useState } from "react";
import { getInsights, getReceipts } from "../services/api";
import { monthlySeries, withProjection, nextMonthForecast } from "../lib/finance";
import { derivePersona } from "../lib/persona";
import { healthSummary, tasteProfile, drinkSplit } from "../lib/health";
import PersonaCard from "../components/PersonaCard";
import RecommendationCard from "../components/RecommendationCard";
import FutureValueCalculator from "../components/FutureValueCalculator";
import { HealthDisclaimer } from "../components/HealthBadge";
import SpendingTrendChart from "../components/charts/SpendingTrendChart";
import BreakdownDonut from "../components/charts/BreakdownDonut";
import MealTypeBar from "../components/charts/MealTypeBar";

const fmtMoney = (n) => `$${(n || 0).toFixed(2)}`;

function computeStats(receipts) {
  const total = receipts.reduce((s, r) => s + (r.total_amount || 0), 0);
  const count = receipts.length;
  const average = count ? total / count : 0;

  const byCuisine = {}, byStore = {}, byMeal = {};
  let drinkPriceSum = 0, drinkPriceCount = 0;

  for (const r of receipts) {
    const cuisine = r.cuisine || "Other";
    byCuisine[cuisine] = (byCuisine[cuisine] || 0) + (r.total_amount || 0);
    if (r.store_name) byStore[r.store_name] = (byStore[r.store_name] || 0) + (r.total_amount || 0);
    if (r.meal_type) byMeal[r.meal_type] = (byMeal[r.meal_type] || 0) + (r.total_amount || 0);
    for (const it of r.items || []) {
      if (it?.kind === "drink" && !it.alcoholic && typeof it.price === "number") {
        drinkPriceSum += it.price;
        drinkPriceCount += 1;
      }
    }
  }

  const cuisines = Object.entries(byCuisine)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  const stores = Object.entries(byStore)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const avgDrink = drinkPriceCount ? drinkPriceSum / drinkPriceCount : 5;

  return { total, count, average, cuisines, stores, byMeal, avgDrink };
}

/* ── Segmented toggle ───────────────────────────────────────────── */
function ModeToggle({ mode, setMode }) {
  const isFood = mode === "food";
  return (
    <div className="relative mx-auto grid w-full max-w-sm grid-cols-2 rounded-full border border-white/60 bg-white/55 p-1 shadow-soft backdrop-blur">
      <span
        className="absolute inset-y-1 w-1/2 rounded-full bg-ink shadow-lift transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: isFood ? "translateX(0%)" : "translateX(100%)" }}
      />
      {[
        { key: "food", label: "🍴 Food" },
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

function SectionCard({ title, badge, children }) {
  return (
    <div className="glass p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-bold text-ink">{title}</h2>
        {badge && (
          <span className="rounded-full bg-ink/6 px-3 py-0.5 text-xs font-medium text-slate">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function MerchantBars({ stores, total }) {
  const max = stores[0]?.amount || 1;
  return (
    <div className="space-y-4">
      {stores.slice(0, 6).map((s, i) => {
        const share = total ? Math.round((s.amount / total) * 100) : 0;
        return (
          <div key={s.name}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/6 text-[10px] font-bold text-slate">{i + 1}</span>
                <span className="truncate font-medium text-ink">{s.name}</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-2">
                <span className="text-xs text-mauve">{share}%</span>
                <span className="font-semibold text-slate">{fmtMoney(s.amount)}</span>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-cream/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate to-mauve transition-[width] duration-700 ease-out"
                style={{ width: `${(s.amount / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Food panel ─────────────────────────────────────────────────── */
function FoodPanel({ stats, receipts, recommendations }) {
  const health = healthSummary(receipts);
  const tastes = tasteProfile(receipts);
  const drinks = drinkSplit(receipts);

  return (
    <div className="space-y-6 stagger">
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Spending by cuisine" badge={`${stats.cuisines.length} cuisines`}>
          <BreakdownDonut data={stats.cuisines} centerLabel="food spend" />
        </SectionCard>

        <SectionCard title="When you eat">
          <MealTypeBar totals={stats.byMeal} />
        </SectionCard>
      </div>

      {/* Drinks + taste profile */}
      <div className="grid gap-6 sm:grid-cols-2">
        <SectionCard title="Drinks">
          {drinks.total > 0 ? (
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <p className="text-3xl font-extrabold text-ink">{drinks.nonAlcoholic}</p>
                <p className="text-xs text-mauve">🧃 Non-alcoholic</p>
              </div>
              <div className="h-10 w-px bg-rose/40" />
              <div className="flex-1">
                <p className="text-3xl font-extrabold text-ink">{drinks.alcoholic}</p>
                <p className="text-xs text-mauve">🍷 Alcoholic</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-mauve">No drinks detected yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Your taste profile">
          {tastes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tastes.map((t) => (
                <span key={t.taste} className="inline-flex items-center gap-1.5 rounded-full border border-mauve/40 bg-mauve/15 px-3 py-1 text-sm capitalize text-ink">
                  <span>{t.icon}</span>{t.taste}
                  <span className="text-xs text-mauve">×{t.count}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-mauve">Upload more receipts to reveal your flavour profile.</p>
          )}
        </SectionCard>
      </div>

      {/* Health summary */}
      <SectionCard title="Health watch" badge="estimated">
        {health.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {health.slice(0, 8).map((h) => (
                <div key={h.label} className="rounded-xl border border-white/60 bg-white/50 p-3 text-center">
                  <div className="text-2xl">{h.icon}</div>
                  <p className="mt-1 text-lg font-extrabold text-ink">{h.count}</p>
                  <p className="text-[11px] leading-tight text-mauve">{h.label}</p>
                </div>
              ))}
            </div>
            <HealthDisclaimer className="mt-4" />
          </>
        ) : (
          <p className="text-sm text-mauve">No health flags detected in your items yet.</p>
        )}
      </SectionCard>

      {/* Taste-based recommendations */}
      {recommendations?.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-bold text-ink">Dishes you might love</h2>
            <span className="rounded-full bg-rose/30 px-2.5 py-0.5 text-[11px] font-semibold text-ink">AI picks</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {recommendations.map((rec, i) => (
              <RecommendationCard
                key={i}
                icon="🍽️"
                title={rec.dish}
                subtitle={rec.cuisine}
                body={rec.reason}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Financial panel ────────────────────────────────────────────── */
function FinancialPanel({ stats, receipts, tips, alternatives }) {
  const series = useMemo(() => monthlySeries(receipts), [receipts]);
  const projected = useMemo(() => withProjection(series, 3), [series]);
  const forecast = useMemo(() => nextMonthForecast(series), [series]);

  return (
    <div className="space-y-6 stagger">
      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total spent", value: fmtMoney(stats.total) },
          { label: "Avg / receipt", value: fmtMoney(stats.average) },
          { label: "Receipts", value: stats.count },
          { label: "Next month ≈", value: fmtMoney(forecast) },
        ].map((s) => (
          <div key={s.label} className="glass p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-mauve">{s.label}</p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Trend + projection */}
      <SectionCard title="Spending trend & forecast" badge="next 3 months projected">
        {series.length >= 1 ? (
          <SpendingTrendChart data={projected} />
        ) : (
          <p className="text-sm text-mauve">Not enough dated receipts to chart a trend yet.</p>
        )}
      </SectionCard>

      {/* Merchants */}
      {stats.stores.length > 0 && (
        <SectionCard title="Top merchants" badge={`${stats.stores.length} total`}>
          <MerchantBars stores={stats.stores} total={stats.total} />
        </SectionCard>
      )}

      {/* Saving tips */}
      {tips?.length > 0 && (
        <div>
          <h2 className="mb-3 font-bold text-ink">💡 Ways to save</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {tips.map((t, i) => (
              <RecommendationCard
                key={i}
                icon="💡"
                title={t.title}
                body={t.detail}
                badge={t.monthly_saving ? `~$${Math.round(t.monthly_saving)}/mo` : null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cost-cutting alternatives */}
      {alternatives?.length > 0 && (
        <div>
          <h2 className="mb-3 font-bold text-ink">🔁 Cheaper swaps</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alternatives.map((a, i) => (
              <RecommendationCard
                key={i}
                icon="🔁"
                title={a.swap_to}
                subtitle={`instead of ${a.instead_of}`}
                badge={a.saving ? `save ~$${Number(a.saving).toFixed(2)}` : null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Future value calculator */}
      <FutureValueCalculator defaultDaily={stats.avgDrink} />
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function InsightsPage() {
  const [receipts, setReceipts] = useState([]);
  const [ai, setAi] = useState(null);
  const [status, setStatus] = useState("loading");
  const [mode, setMode] = useState("food");

  useEffect(() => {
    Promise.all([getReceipts(), getInsights()])
      .then(([r, i]) => { setReceipts(r.data); setAi(i.data); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, []);

  const stats = useMemo(() => computeStats(receipts), [receipts]);
  const persona = useMemo(() => derivePersona(receipts), [receipts]);

  if (status === "loading") {
    return (
      <div className="animate-fade-up space-y-6">
        <div className="skeleton h-36 rounded-3xl" />
        <div className="skeleton mx-auto h-12 w-72 rounded-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
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
        <div className="glass mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-lift">📊</div>
        <h1 className="mb-2 text-2xl font-extrabold text-ink">No data yet</h1>
        <p className="text-slate">Upload some receipts to unlock your personalized food &amp; finance insights.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <PersonaCard persona={persona} />

      <ModeToggle mode={mode} setMode={setMode} />

      <div key={mode} className="animate-fade-up">
        {mode === "food" ? (
          <FoodPanel stats={stats} receipts={receipts} recommendations={ai?.recommendations} />
        ) : (
          <FinancialPanel stats={stats} receipts={receipts} tips={ai?.tips} alternatives={ai?.alternatives} />
        )}
      </div>
    </div>
  );
}
