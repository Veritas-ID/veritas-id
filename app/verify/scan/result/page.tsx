"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ChartRenderer from "@/components/ChartRenderer";
import { VeritasRecord } from "@/lib/supabase";

interface ScanSessionPayload {
  apiResult: {
    success: boolean;
    id?: string;
    record?: VeritasRecord;
    reason?: string;
  };
  base64Image: string;
}

type PageState =
  | { status: "loading" }
  | { status: "no-data" }
  | { status: "ready"; payload: ScanSessionPayload };

export default function ScanResultPage() {
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    const raw = sessionStorage.getItem("veritas_scan_result");
    if (!raw) {
      setState({ status: "no-data" });
      return;
    }
    try {
      const payload: ScanSessionPayload = JSON.parse(raw);
      sessionStorage.removeItem("veritas_scan_result");
      setState({ status: "ready", payload });
    } catch {
      sessionStorage.removeItem("veritas_scan_result");
      setState({ status: "no-data" });
    }
  }, []);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading result…</p>
      </div>
    );
  }

  if (state.status === "no-data") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-700">No result data found.</p>
        <Link href="/" className="text-sm text-[#0057B8] hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  const { apiResult, base64Image } = state.payload;

  if (!apiResult.success) {
    return (
      <div className="min-h-screen">
        {/* Failure banner */}
        <div
          className="w-full px-6 py-8 text-white"
          style={{ backgroundColor: "#DC2626" }}
        >
          <div className="max-w-[1200px] mx-auto flex items-start gap-4">
            <span className="text-3xl leading-none">⚠️</span>
            <p className="text-base leading-relaxed">{apiResult.reason}</p>
          </div>
        </div>

        {/* Help section */}
        <div className="max-w-[1200px] mx-auto px-4 py-8">
          <Link href="/" className="text-sm text-[#0057B8] hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const record = apiResult.record!;

  const formattedDate = new Date(record.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="min-h-screen">
      {/* Success banner */}
      <div
        className="w-full px-6 py-8 text-white"
        style={{ backgroundColor: "#16A34A" }}
      >
        <div className="max-w-[1200px] mx-auto flex items-start gap-4">
          <span className="text-3xl leading-none">✅</span>
          <div>
            <h1 className="text-xl font-semibold mb-1">
              Chart Found &amp; Verified
            </h1>
            <p className="text-sm opacity-90">
              Veritas ID {apiResult.id} matched a record in the database.
              Original chart has been recreated below.
            </p>
          </div>
        </div>
      </div>

      {/* Two-column comparison grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-[1200px] mx-auto px-4 py-8">
        {/* LEFT — You Uploaded */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            You Uploaded
          </h3>
          <img
            src={base64Image}
            alt="Uploaded chart"
            className="w-full rounded-lg border border-gray-200"
          />
          <p className="text-sm text-gray-500 mt-2">Your uploaded screenshot</p>
        </div>

        {/* RIGHT — Original on Record */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Original on Record
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {record.indicator_label} — {record.country_name},{" "}
              {record.year_start}–{record.year_end}
            </h2>
            <ChartRenderer years={record.years} values={record.values} />
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-400 w-24">Veritas ID:</span>
                <span className="font-mono text-gray-900">{record.id}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-24">Indicator:</span>
                <span className="text-gray-800">{record.indicator_label}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-24">Country:</span>
                <span className="text-gray-800">{record.country_name}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-24">Period:</span>
                <span className="text-gray-800">
                  {record.year_start} – {record.year_end}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-24">Source:</span>
                <span className="text-gray-800">World Bank Data360</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-24">Generated:</span>
                <span className="text-gray-800">{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
