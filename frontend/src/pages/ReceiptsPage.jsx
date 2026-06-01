import { useEffect, useState } from "react";
import { getReceipts } from "../services/api";

const fmtMoney = (n) =>
  typeof n === "number" ? `$${n.toFixed(2)}` : "—";

const fmtUploaded = (ts) =>
  ts ? new Date(ts * 1000).toLocaleDateString() : "";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [status, setStatus] = useState("loading"); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    getReceipts()
      .then((res) => {
        setReceipts(res.data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading") {
    return <p className="text-center text-gray-500 py-16">Loading receipts…</p>;
  }

  if (status === "error") {
    return (
      <p className="text-center text-red-500 py-16">
        ❌ Couldn't load receipts — is the backend running?
      </p>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-6xl mb-4">🗂️</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your Receipts</h1>
        <p className="text-gray-500">
          No receipts yet. Upload one to see it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Receipts</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {receipts.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-xl border shadow-sm p-5 flex flex-col"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-800">
                  {r.store_name || "Unknown store"}
                </p>
                <p className="text-sm text-gray-400">
                  {r.date || fmtUploaded(r.uploaded_at)}
                </p>
              </div>
              <p className="text-lg font-bold text-emerald-600 whitespace-nowrap">
                {fmtMoney(r.total_amount)}
              </p>
            </div>

            {r.category && (
              <span className="mt-2 self-start text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                {r.category}
              </span>
            )}

            {r.items && r.items.length > 0 && (
              <ul className="mt-3 text-sm text-gray-600 space-y-0.5">
                {r.items.slice(0, 5).map((item, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">
                      {typeof item === "string" ? item : item.name}
                    </span>
                    {item && typeof item === "object" && item.price != null && (
                      <span className="text-gray-400 whitespace-nowrap">
                        {fmtMoney(item.price)}
                      </span>
                    )}
                  </li>
                ))}
                {r.items.length > 5 && (
                  <li className="text-gray-400">
                    +{r.items.length - 5} more…
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
