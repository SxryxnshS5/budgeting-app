import { useEffect, useState } from "react";
import { getReceipts } from "../services/api";

const fmtMoney = (n) => (typeof n === "number" ? `$${n.toFixed(2)}` : "—");

const fmtUploaded = (ts) => (ts ? new Date(ts * 1000).toLocaleDateString() : "");

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
    return <p className="py-20 text-center text-mauve">Loading receipts…</p>;
  }

  if (status === "error") {
    return (
      <p className="py-20 text-center text-rose">
        ❌ Couldn't load receipts — is the backend running?
      </p>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center animate-fade-up">
        <div className="mb-4 text-6xl">🗂️</div>
        <h1 className="mb-2 text-2xl font-extrabold text-ink">Your Receipts</h1>
        <p className="text-slate">No receipts yet. Upload one to see it here.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-ink">
        Your Receipts
      </h1>
      <div className="grid gap-4 stagger sm:grid-cols-2">
        {receipts.map((r) => (
          <div
            key={r.id}
            className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-5 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">
                  {r.store_name || "Unknown store"}
                </p>
                <p className="text-sm text-mauve">
                  {r.date || fmtUploaded(r.uploaded_at)}
                </p>
              </div>
              <p className="whitespace-nowrap text-lg font-extrabold text-slate">
                {fmtMoney(r.total_amount)}
              </p>
            </div>

            {r.category && (
              <span className="mt-2 self-start rounded-full bg-rose/40 px-2.5 py-0.5 text-xs font-medium text-ink">
                {r.category}
              </span>
            )}

            {r.items && r.items.length > 0 && (
              <ul className="mt-3 space-y-0.5 text-sm text-slate">
                {r.items.slice(0, 5).map((item, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">
                      {typeof item === "string" ? item : item.name}
                    </span>
                    {item && typeof item === "object" && item.price != null && (
                      <span className="whitespace-nowrap text-mauve">
                        {fmtMoney(item.price)}
                      </span>
                    )}
                  </li>
                ))}
                {r.items.length > 5 && (
                  <li className="text-mauve">+{r.items.length - 5} more…</li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
