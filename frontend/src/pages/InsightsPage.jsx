import { useEffect, useMemo, useState } from "react";
import { getInsights, getReceipts } from "../services/api";

const fmtMoney = (n) => `$${(n || 0).toFixed(2)}`;

/** Compute very basic spending insights from the raw receipts. */
function computeStats(receipts) {
  const total = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const count = receipts.length;
  const average = count ? total / count : 0;

  const byCategory = {};
  const byStore = {};
  for (const r of receipts) {
    const cat = r.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + (r.total_amount || 0);
    if (r.store_name) {
      byStore[r.store_name] = (byStore[r.store_name] || 0) + (r.total_amount || 0);
    }
  }

  const categories = Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const topStore = Object.entries(byStore).sort((a, b) => b[1] - a[1])[0];

  return { total, count, average, categories, topStore };
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}

export default function InsightsPage() {
  const [receipts, setReceipts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [status, setStatus] = useState("loading"); // 'loading' | 'ready' | 'error'

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
    return <p className="text-center text-gray-500 py-16">Crunching numbers…</p>;
  }

  if (status === "error") {
    return (
      <p className="text-center text-red-500 py-16">
        ❌ Couldn't load insights — is the backend running?
      </p>
    );
  }

  if (stats.count === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-6xl mb-4">📊</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Spending Insights
        </h1>
        <p className="text-gray-500">
          Upload some receipts to see your spending insights.
        </p>
      </div>
    );
  }

  const maxCat = stats.categories[0]?.amount || 1;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Spending Insights
      </h1>

      {/* Headline numbers */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 mb-8">
        <StatCard label="Total spent" value={fmtMoney(stats.total)} />
        <StatCard label="Receipts" value={stats.count} />
        <StatCard label="Avg / receipt" value={fmtMoney(stats.average)} />
      </div>

      {/* Spending by category */}
      <div className="bg-white rounded-xl border shadow-sm p-5 mb-8">
        <h2 className="font-semibold text-gray-800 mb-4">Spending by category</h2>
        <div className="space-y-3">
          {stats.categories.map((c) => (
            <div key={c.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{c.name}</span>
                <span className="text-gray-500">{fmtMoney(c.amount)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(c.amount / maxCat) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {stats.topStore && (
          <p className="text-sm text-gray-500 mt-4">
            🏆 Top merchant:{" "}
            <span className="font-medium text-gray-700">
              {stats.topStore[0]}
            </span>{" "}
            ({fmtMoney(stats.topStore[1])})
          </p>
        )}
      </div>

      {/* AI-generated insights */}
      {insights?.insights && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h2 className="font-semibold text-blue-900 mb-2">🤖 AI Analysis</h2>
          <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
            {insights.insights}
          </p>
        </div>
      )}
    </div>
  );
}
