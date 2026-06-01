import { useState, useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { futureValue } from "../lib/finance";
import { PALETTE } from "./charts/chartTheme";

const PRESETS = [
  { label: "☕ Daily coffee", daily: 5 },
  { label: "🥪 Lunch out", daily: 15 },
  { label: "🥡 Weekend takeaway", daily: 25 },
];

const fmtUSD = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function Slider({ label, value, min, max, step, suffix, onChange }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate">{label}</span>
        <span className="font-bold text-ink">{suffix === "$" ? `$${value}` : `${value}${suffix}`}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-cream accent-ink"
      />
    </div>
  );
}

function MiniTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/60 bg-ink/95 px-2.5 py-1.5 text-xs text-cream shadow-lift">
      <p className="font-semibold">Year {label}</p>
      <p className="text-cream/70">Worth: <span className="font-semibold text-cream">{fmtUSD(payload[0].value)}</span></p>
    </div>
  );
}

/**
 * "Invest it instead" future-value calculator.
 * @param defaultDaily optional starting daily spend (e.g. their real coffee avg)
 */
export default function FutureValueCalculator({ defaultDaily = 5 }) {
  const [daily, setDaily] = useState(Math.max(1, Math.round(defaultDaily)));
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(20);

  const result = useMemo(() => futureValue(daily, rate, years), [daily, rate, years]);

  return (
    <div className="glass overflow-hidden">
      {/* Header */}
      <div className="border-b border-cream/80 p-6 pb-5">
        <h3 className="font-bold text-ink">💸 What if you invested it instead?</h3>
        <p className="mt-1 text-sm text-slate">
          See what a daily food habit could grow to if you invested the money.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setDaily(p.daily)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                daily === p.daily
                  ? "border-ink bg-ink text-cream"
                  : "border-mauve/40 bg-white/50 text-slate hover:border-ink/50 hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        {/* Controls */}
        <div className="space-y-5">
          <Slider label="Daily spend" value={daily} min={1} max={50} step={1} suffix="$" onChange={setDaily} />
          <Slider label="Annual return" value={rate} min={1} max={15} step={0.5} suffix="%" onChange={setRate} />
          <Slider label="Years invested" value={years} min={1} max={40} step={1} suffix=" yrs" onChange={setYears} />

          <div className="rounded-xl border border-white/60 bg-white/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate">You'd invest</span>
              <span className="font-semibold text-ink">{fmtUSD(result.contributed)}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-slate">Investment growth</span>
              <span className="font-semibold text-ink">+{fmtUSD(result.growth)}</span>
            </div>
            <div className="mt-1.5 text-xs text-mauve">≈ {fmtUSD(result.perMonth)} / month invested</div>
          </div>
        </div>

        {/* Result + chart */}
        <div className="flex flex-col">
          <div className="rounded-2xl bg-ink p-5 text-cream">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-cream/60">
              In {years} years, that's
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight">{fmtUSD(result.futureValue)}</p>
            <p className="mt-1 text-xs text-cream/70">
              from {fmtUSD(daily)}/day at {rate}% annual return
            </p>
          </div>

          <div className="mt-4 flex-1">
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={result.yearly} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.mauve} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={PALETTE.mauve} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.mauve} strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="year" tick={{ fill: PALETTE.mauve, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<MiniTooltip />} />
                <Area type="monotone" dataKey="value" stroke={PALETTE.ink} strokeWidth={2.5} fill="url(#fvFill)" isAnimationActive animationDuration={700} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <p className="px-6 pb-5 text-[11px] italic text-mauve">
        ⓘ Illustrative estimate using monthly compounding. Not financial advice.
      </p>
    </div>
  );
}
