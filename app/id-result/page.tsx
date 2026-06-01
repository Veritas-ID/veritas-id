"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ChartRenderer from "@/components/ChartRenderer";
import { VeritasRecord } from "@/lib/supabase";

interface LookupResponse {
  success: boolean;
  record?: VeritasRecord;
  reason?: string;
}

interface IDSessionPayload {
  apiResult: LookupResponse;
}

type PageState =
  | { status: "loading" }
  | { status: "no-data" }
  | { status: "ready"; payload: IDSessionPayload };

export default function IDResultPage() {
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    const raw = sessionStorage.getItem("veritas_id_result");
    if (!raw) {
      setState({ status: "no-data" });
      return;
    }
    try {
      const payload = JSON.parse(raw) as IDSessionPayload;
      setState({ status: "ready", payload });
    } catch {
      setState({ status: "no-data" });
    }
  }, []);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (state.status === "no-data") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-700">No result data found.</p>
        <Link href="/" className="text-sm" style={{ color: "#0057B8" }}>
          ← Back to Home
        </Link>
      </div>
    );
  }

  const { apiResult } = state.payload;

  // ── Failure state ──────────────────────────────────────────────────────────
  if (!apiResult.success) {
    return (
      <div>
        {/* Verdict Banner */}
        <div
          className="w-full px-6 py-8 text-white"
          style={{ backgroundColor: "#DC2626" }}
        >
          <div className="max-w-[800px] mx-auto flex items-start gap-4">
            <span className="text-3xl leading-none">⚠️</span>
            <p className="text-lg font-medium">{apiResult.reason}</p>
          </div>
        </div>

        {/* Help section */}
        <div className="max-w-[800px] mx-auto px-4 py-8">
          <Link href="/" className="text-sm" style={{ color: "#0057B8" }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  const record = apiResult.record!;

  const formattedDate = new Date(record.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Veritas ID", value: record.id, mono: true },
    { label: "Indicator", value: record.indicator_label },
    { label: "Country", value: record.country_name },
    { label: "Period", value: `${record.year_start} – ${record.year_end}` },
    { label: "Source", value: "World Bank Data360" },
    { label: "Generated", value: formattedDate },
    { label: "Hash", value: `${record.hash.slice(0, 16)}...`, mono: true },
  ];

  return (
    <div>
      {/* Verdict Banner */}
      <div
        className="w-full px-6 py-8 text-white"
        style={{ backgroundColor: "#16A34A" }}
      >
        <div className="max-w-[800px] mx-auto flex items-start gap-4">
          <span className="text-3xl leading-none">✅</span>
          <div>
            <h1 className="text-2xl font-bold mb-1">Verified</h1>
            <p className="text-lg">
              Veritas ID {record.id} is authentic and on record.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[800px] mx-auto px-4 py-8">
        {/* Chart card recreation */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {record.indicator_label} — {record.country_name},{" "}
            {record.year_start}–{record.year_end}
          </h2>

          <ChartRenderer years={record.years} values={record.values} />

          <hr className="my-6 border-gray-200" />

          {/* Metadata table */}
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rows.map(({ label, value, mono }) => (
                <tr
                  key={label}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-2 pr-6 text-gray-400 font-medium whitespace-nowrap w-32">
                    {label}
                  </td>
                  <td
                    className={`py-2 text-gray-800 break-all ${
                      mono ? "font-mono text-xs" : ""
                    }`}
                  >
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Back link */}
        <div className="mt-6">
          <Link href="/" className="text-sm" style={{ color: "#0057B8" }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
