import { useState, useRef } from "react";
import { uploadReceipt } from "../services/api";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: "📸",
    title: "Snap or drop",
    desc: "Take a photo of any food receipt — restaurant, grocery, takeaway.",
  },
  {
    icon: "🤖",
    title: "AI extracts",
    desc: "Our AI reads the items, total, merchant and category instantly.",
  },
  {
    icon: "📊",
    title: "See insights",
    desc: "Track spending patterns, top categories and monthly trends.",
  },
];

function UploadIcon({ active }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`mx-auto mb-4 h-14 w-14 transition-transform duration-500 ${active ? "scale-110" : ""}`}
      fill="none"
    >
      <circle cx="32" cy="32" r="31" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 3" className="text-mauve/50" />
      <path
        d="M32 40V24M32 24l-6 6M32 24l6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-colors duration-300 ${active ? "text-ink" : "text-slate"}`}
      />
      <rect x="20" y="43" width="24" height="3" rx="1.5" fill="currentColor" className="text-rose" />
    </svg>
  );
}

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f && f.type.startsWith("image/")) {
      setFile(f);
      setStatus(null);
    } else if (f) {
      setFile(null);
      setStatus("error");
      setErrorMsg("Only image files (JPG, PNG, WebP) are accepted.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    try {
      await uploadReceipt(file);
      setStatus("success");
      setFile(null);
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err?.response?.data?.detail || "Upload failed — is the backend running?"
      );
    }
  };

  return (
    <div className="animate-fade-up space-y-12">

      {/* ── Hero row ─────────────────────────────────────────────── */}
      <div className="grid items-center gap-10 lg:grid-cols-2">

        {/* Left: copy */}
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-mauve/30 bg-white/60 px-3.5 py-1.5 text-xs font-semibold tracking-widest text-slate backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-mauve animate-pulse-soft" />
            AI-POWERED RECEIPT SCANNER
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            Turn receipts<br />
            into <span className="relative inline-block">
              <span className="relative z-10">insights</span>
              <span className="absolute inset-x-0 bottom-0.5 -z-0 h-3 rounded bg-rose/50" />
            </span>
          </h1>

          <p className="max-w-sm text-base leading-relaxed text-slate">
            Drop a photo of any food bill and let AI handle the rest — every
            item catalogued, every dollar tracked.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            {["Groceries", "Restaurants", "Takeaway", "Cafés"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-rose/40 bg-rose/20 px-3 py-1 text-xs font-medium text-ink"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right: drop zone */}
        <div className="space-y-4">
          <div
            className={`group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
              dragOver
                ? "scale-[1.02] border-ink bg-white/90 shadow-lift"
                : "border-mauve/50 bg-white/55 hover:border-ink/60 hover:bg-white/75 hover:shadow-soft"
            }`}
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          >
            {/* Corner accents */}
            <span className="absolute left-3 top-3 h-5 w-5 rounded-tl-xl border-l-2 border-t-2 border-mauve/40" />
            <span className="absolute right-3 top-3 h-5 w-5 rounded-tr-xl border-r-2 border-t-2 border-mauve/40" />
            <span className="absolute bottom-3 left-3 h-5 w-5 rounded-bl-xl border-b-2 border-l-2 border-mauve/40" />
            <span className="absolute bottom-3 right-3 h-5 w-5 rounded-br-xl border-b-2 border-r-2 border-mauve/40" />

            <UploadIcon active={dragOver} />

            {file ? (
              <div className="space-y-1 animate-scale-in">
                <p className="font-semibold text-ink">{file.name}</p>
                <p className="text-sm text-mauve">Ready to upload</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold text-ink">
                  Drag &amp; drop your receipt
                </p>
                <p className="text-sm text-mauve">
                  or click to browse · JPG, PNG, WebP
                </p>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || status === "uploading"}
            className="w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-cream shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {status === "uploading" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream" />
                Analysing receipt…
              </span>
            ) : (
              "Upload Receipt"
            )}
          </button>

          {status === "success" && (
            <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-5 py-3.5 shadow-soft backdrop-blur animate-scale-in">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 text-base">✓</span>
                <div>
                  <p className="text-sm font-semibold text-ink">Receipt saved!</p>
                  <p className="text-xs text-mauve">AI extraction complete</p>
                </div>
              </div>
              <Link
                to="/receipts"
                className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-cream transition-opacity hover:opacity-80"
              >
                View →
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-2xl border border-rose/60 bg-rose/20 px-5 py-3.5 animate-scale-in">
              <p className="text-sm font-medium text-ink">❌ {errorMsg}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────── */}
      <div>
        <p className="mb-5 text-center text-xs font-semibold tracking-widest text-mauve uppercase">
          How it works
        </p>
        <div className="grid gap-4 stagger sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="glass p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/6 text-xl">
                  {s.icon}
                </span>
                <span className="text-[11px] font-bold tracking-widest text-mauve uppercase">
                  Step {i + 1}
                </span>
              </div>
              <p className="mb-1 font-semibold text-ink">{s.title}</p>
              <p className="text-sm leading-relaxed text-slate">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
