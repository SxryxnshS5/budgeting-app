// Deterministic financial math used by the Insights dashboard.
// Everything here is computed client-side from the raw receipts — no API cost.

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Best-effort YYYY-MM key for a receipt, using `date` then `uploaded_at`. */
function monthKey(r) {
  if (r.date && /^\d{4}-\d{2}/.test(r.date)) return r.date.slice(0, 7);
  if (r.uploaded_at) {
    const d = new Date(r.uploaded_at * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}

/** Chronological [{ key, label, total, projected:false }] of monthly spend. */
export function monthlySeries(receipts) {
  const totals = {};
  for (const r of receipts) {
    const key = monthKey(r);
    if (!key) continue;
    totals[key] = (totals[key] || 0) + (r.total_amount || 0);
  }
  return Object.keys(totals)
    .sort()
    .map((key) => {
      const [y, m] = key.split("-");
      return {
        key,
        label: `${MONTH_LABELS[Number(m) - 1]} ${y.slice(2)}`,
        total: Math.round(totals[key] * 100) / 100,
        projected: false,
      };
    });
}

/** Least-squares slope/intercept over a numeric array (x = index). */
function linearFit(ys) {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0 };
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  ys.forEach((y, i) => {
    num += (i - xMean) * (y - yMean);
    den += (i - xMean) ** 2;
  });
  const slope = den ? num / den : 0;
  return { slope, intercept: yMean - slope * xMean };
}

/**
 * Append `n` projected months to a monthly series using a linear trend fit.
 * Returns the full series (actual + projected) for charting.
 */
export function withProjection(series, n = 3) {
  if (series.length === 0) return [];
  const ys = series.map((p) => p.total);
  const { slope, intercept } = linearFit(ys);

  const out = series.map((p) => ({ ...p, actual: p.total, forecast: null }));
  // Bridge point so the dashed forecast line connects to the last actual.
  out[out.length - 1].forecast = out[out.length - 1].total;

  const [lastY, lastM] = series[series.length - 1].key.split("-").map(Number);
  for (let i = 1; i <= n; i++) {
    const idx = series.length - 1 + i;
    const value = Math.max(0, Math.round((intercept + slope * idx) * 100) / 100);
    const date = new Date(lastY, lastM - 1 + i, 1);
    out.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
      total: null,
      actual: null,
      forecast: value,
      projected: true,
    });
  }
  return out;
}

/** Projected spend for next month (first forecast point), or current average. */
export function nextMonthForecast(series) {
  if (series.length === 0) return 0;
  const { slope, intercept } = linearFit(series.map((p) => p.total));
  return Math.max(0, intercept + slope * series.length);
}

/**
 * Future value of investing a daily habit instead of spending it.
 * Contributions are treated as a monthly annuity compounded monthly.
 *
 * @returns { futureValue, contributed, growth, perMonth, yearly:[{year,value,contributed}] }
 */
export function futureValue(dailyAmount, annualRatePct, years) {
  const perMonth = dailyAmount * 30.44;       // avg days per month
  const r = annualRatePct / 100 / 12;          // monthly rate
  const N = Math.round(years * 12);

  const fvAt = (months) =>
    r === 0 ? perMonth * months : perMonth * ((Math.pow(1 + r, months) - 1) / r);

  const yearly = [];
  for (let y = 0; y <= years; y++) {
    const months = y * 12;
    yearly.push({
      year: y,
      value: Math.round(fvAt(months)),
      contributed: Math.round(perMonth * months),
    });
  }

  const fv = fvAt(N);
  const contributed = perMonth * N;
  return {
    futureValue: Math.round(fv),
    contributed: Math.round(contributed),
    growth: Math.round(fv - contributed),
    perMonth: Math.round(perMonth * 100) / 100,
    yearly,
  };
}
