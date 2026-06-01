"use client";

import { useRef, useState } from "react";
import { validateFile } from "@/lib/validateFile";

// ─── ScanCard ────────────────────────────────────────────────────────────────

function ScanCard() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFileChange(selected: File) {
    const result = validateFile(selected);
    if (!result.valid) {
      setError(result.reason);
      setFile(null);
    } else {
      setFile(selected);
      setError(null);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFileChange(selected);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileChange(dropped);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Strip the data URL prefix to get raw base64
      const base64 = dataUrl.split(",")[1];
      const mediaType = file.type;

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem(
          "veritas_scan_result",
          JSON.stringify({ apiResult: data, base64Image: dataUrl })
        );
        window.location.href = "/scan-result";
      } else {
        setError(data.reason);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 border border-gray-200 shadow-sm rounded-lg bg-white flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-2">
        {/* Arrow-up-tray icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-8 h-8 text-gray-400"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        <h3 className="text-base font-semibold text-gray-900">
          Upload Chart Image
        </h3>
        <p className="text-sm text-gray-500">
          Upload a screenshot — we&apos;ll find and verify it automatically
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Click or drag to upload an image"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
          dragOver
            ? "border-[#0057B8] bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <span className="text-sm text-gray-500">
          Drag &amp; drop or click to select
        </span>
        <span className="text-xs text-gray-400">PNG, JPG, JPEG · max 10 MB</span>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Selected filename */}
      {file && (
        <p className="text-sm text-gray-600 truncate" aria-live="polite">
          Selected: <span className="font-medium">{file.name}</span>
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        style={{ backgroundColor: "#0057B8" }}
        className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Scanning…" : "Scan & Verify"}
      </button>
    </div>
  );
}

// ─── IDCard ──────────────────────────────────────────────────────────────────

function IDCard() {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    const trimmedId = inputValue.trim();
    if (!trimmedId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/lookup/${trimmedId}`);
      const data = await res.json();

      sessionStorage.setItem(
        "veritas_id_result",
        JSON.stringify({ apiResult: data })
      );
      window.location.href = "/id-result";
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 border border-gray-200 shadow-sm rounded-lg bg-white flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-2">
        {/* Magnifying glass icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-8 h-8 text-gray-400"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <h3 className="text-base font-semibold text-gray-900">Verify by ID</h3>
        <p className="text-sm text-gray-500">
          Enter the Veritas ID shown on any chart
        </p>
      </div>

      {/* Text input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="VID-KEN-UNEM-8A4F2B"
        disabled={loading}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0057B8] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Verify button */}
      <button
        type="button"
        onClick={handleVerify}
        disabled={loading || !inputValue.trim()}
        style={{ backgroundColor: "#0057B8" }}
        className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Verifying…" : "Verify"}
      </button>
    </div>
  );
}

// ─── VerifySection ────────────────────────────────────────────────────────────

export function VerifySection() {
  return (
    <section id="verify" className="w-full max-w-[800px] py-12">
      <h2 className="text-2xl font-bold text-gray-900">Verify a Chart</h2>
      <p className="text-gray-500 mt-1 mb-8">
        Check if a chart is authentic and unmodified
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <ScanCard />

        <IDCard />
      </div>
    </section>
  );
}
