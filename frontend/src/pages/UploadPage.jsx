import { useState, useRef } from "react";
import { uploadReceipt } from "../services/api";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
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
    <div className="mx-auto max-w-lg animate-fade-up">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-ink">
        Upload a Receipt
      </h1>
      <p className="mb-7 text-slate">
        Drop a receipt image to turn it into tracked spending.
      </p>

      {/* Drop zone */}
      <div
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
          dragOver
            ? "scale-[1.02] border-ink bg-white/80 shadow-lift"
            : "border-mauve/60 bg-white/50 hover:border-ink hover:bg-white/70 hover:shadow-soft"
        }`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <div
          className={`mb-3 text-5xl transition-transform duration-300 ${
            dragOver ? "scale-110" : ""
          }`}
        >
          📄
        </div>
        {file ? (
          <p className="font-medium text-ink">{file.name}</p>
        ) : (
          <>
            <p className="font-medium text-ink">Drag &amp; drop or click to select</p>
            <p className="mt-1 text-sm text-mauve">
              Food receipts only · JPG, PNG, WebP
            </p>
          </>
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
        className="mt-5 w-full rounded-2xl bg-ink py-3 font-semibold text-cream shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {status === "uploading" ? "Uploading…" : "Upload Receipt"}
      </button>

      {status === "success" && (
        <p className="mt-4 text-center font-medium text-slate animate-fade-up">
          ✅ Receipt uploaded successfully!
        </p>
      )}
      {status === "error" && (
        <p className="mt-4 text-center font-medium text-rose animate-fade-up">
          ❌ {errorMsg}
        </p>
      )}
    </div>
  );
}
