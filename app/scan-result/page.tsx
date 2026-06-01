"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ChartRenderer from "@/components/ChartRenderer";
import { VeritasRecord } from "@/lib/supabase";

interface Discrepancy {
  index: number;
  year: number;
  stored: number;
  extracted: number;
}

interface ScanApiResult {
  success: boolean;
  id?: string;
  tampered?: boolean;
  extracted_values?: number[];
  stored_values?: number[];
  discrepancies?: Discrepancy[];
  record?: VeritasRecord;
  reason?: string;
}

interface ScanSessionPayload {
  apiResult: ScanApiResult;
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
      setState({ status: "ready", payload });
    } catch {
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

  // ── Failure (no record found or no ID extracted) ───────────────────────────
  if (!apiResult.success) {
    return (
      <div className="min-h-screen">
        <div
          className="w-full px-6 py-8 text-white"
          style={{ backgroundColor: "#DC2626" }}
        >
          <div className="max-w-[1200px] mx-auto flex items-start gap-4">
            <span className="text-3xl leading-none">⚠️</span>
            <p className="text-base leading-relaxed">{apiResult.reason}</p>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-4 py-8">
          <Link href="/" className="text-sm text-[#0057B8] hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const record = apiResult.record!;
  const tampered = apiResult.tampered ?? false;
  const discrepancies = apiResult.discrepancies ?? [];
  const extractedValues = apiResult.extracted_values ?? [];
  const storedValues = (apiResult.stored_values ?? record.values) as number[];

  const summary = (record.chart_config as { summary?: string }).summary ?? "";
  const formattedDate = new Date(record.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // QR code URL — we generate it as a plain URL; the QRCode server component
  // can't be used in a client page, so we show the verify link as text instead
  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/verify/${record.id}`;

  const bannerBg = tampered ? "#DC2626" : "#16A34A";
  const bannerIcon = tampered ? "⚠️" : "✅";
  const bannerHeading = tampered ? "Tampered Data Detected" : "Chart Found & Verified";
  const bannerSubtext = tampered
    ? "Despite being generated through this platform, the chart you uploaded has been tampered with."
    : `Veritas ID ${apiResult.id} is authentic. See original chart on the right.`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Verdict Banner ─────────────────────────────────────────────────── */}
      <div className="w-full px-6 py-8 text-white" style={{ backgroundColor: bannerBg }}>
        <div className="max-w-[1200px] mx-auto flex items-start gap-4">
          <span className="text-3xl leading-none">{bannerIcon}</span>
          <div>
            <h1 className="text-xl font-semibold mb-1">{bannerHeading}</h1>
            <p className="text-sm opacity-90">{bannerSubtext}</p>
          </div>
        </div>
      </div>

      {/* ── Two-column comparison ───────────────────────────────────────────── */}
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT — You Uploaded */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">You Uploaded</h3>
            <img
              src={base64Image}
              alt="Uploaded chart"
              className="w-full rounded-lg border border-gray-200"
            />
            <p className="text-sm text-gray-500 mt-2">Your uploaded screenshot</p>
          </div>

          {/* RIGHT — Original on Record (matches ChartCard layout exactly) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Original on Record</h3>
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8">
              {/* Title */}
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {record.indicator_label} — {record.country_name}, {record.year_start}–{record.year_end}
              </h2>

              {/* Chart */}
              <ChartRenderer years={record.years} values={record.values} />

              {/* Summary */}
              {summary && (
                <p className="mt-4 text-sm text-gray-600 italic">{summary}</p>
              )}

              {/* Divider */}
              <hr className="my-6 border-gray-200" />

              {/* Footer row — matches ChartCard footer */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Veritas ID:</span>
                  <span className="font-mono text-sm text-gray-900">{record.id}</span>
                  <span className="text-xs text-gray-400">Source: World Bank Data360</span>
                  <span className="text-xs text-gray-400">{formattedDate}</span>
                </div>
                {/* QR code as link (server QRCode component unavailable in client) */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-20 h-20 border border-gray-200 rounded flex items-center justify-center text-center text-xs text-gray-400 hover:border-[#0057B8] transition-colors"
                    title="Verify this chart"
                  >
                    <span>Scan to<br />verify</span>
                  </a>
                </div>
              </div>

              {/* Verified badge */}
              {!tampered && (
                <div className="mt-4 flex items-center gap-2 text-xs font-medium" style={{ color: "#16A34A" }}>
                  <span>✓</span>
                  <span>VERIFIED DATA ARTIFACT</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Discrepancy table (only when tampered) ─────────────────────── */}
        {tampered && discrepancies.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Data Discrepancies</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Year</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-medium">Original Value</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-medium">Value in Image</th>
                    <th className="text-center py-3 px-4 text-gray-600 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.years as number[]).map((year, i) => {
                    const disc = discrepancies.find((d) => d.index === i);
                    const isModified = !!disc;
                    const extractedVal = extractedValues[i];
                    const storedVal = storedValues[i];
                    return (
                      <tr
                        key={year}
                        className={`border-b border-gray-100 last:border-0 ${isModified ? "bg-red-50" : ""}`}
                      >
                        <td className={`py-2 px-4 font-mono ${isModified ? "text-red-700 font-semibold" : "text-gray-700"}`}>
                          {year}
                        </td>
                        <td className={`py-2 px-4 text-right font-mono ${isModified ? "text-red-700 font-semibold" : "text-gray-700"}`}>
                          {storedVal !== undefined ? storedVal.toFixed(1) + "%" : "—"}
                        </td>
                        <td className={`py-2 px-4 text-right font-mono ${isModified ? "text-red-700 font-semibold" : "text-gray-700"}`}>
                          {extractedVal !== undefined ? extractedVal.toFixed(1) + "%" : "—"}
                        </td>
                        <td className="py-2 px-4 text-center">
                          {isModified ? (
                            <span style={{ color: "#DC2626" }}>⚠️ Modified</span>
                          ) : (
                            <span style={{ color: "#16A34A" }}>✅ Match</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8">
          <Link href="/" className="text-sm text-[#0057B8] hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
