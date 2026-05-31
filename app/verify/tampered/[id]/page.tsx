import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { computeHash } from "@/lib/hash";
import { VerificationBadge } from "@/components/VerificationBadge";

interface TamperedVerifyPageProps {
  params: { id: string };
}

export default async function TamperedVerifyPage({
  params,
}: TamperedVerifyPageProps) {
  const { id } = params;

  const { data: record, error } = await supabaseAdmin
    .from("veritas_records")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !record) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen py-12 px-4">
        <VerificationBadge status="not-found" />
        <Link href="/" className="mt-4 text-sm text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </main>
    );
  }

  // Tamper first value in memory only — does not touch the database
  const tamperedValues = [...record.values];
  tamperedValues[0] = tamperedValues[0] * 1.8;

  // Recompute hash of tampered data — will NOT match stored hash
  const tamperedHash = computeHash(record.years, tamperedValues);
  const hashMatch = tamperedHash === record.hash; // always false

  // Show up to 10 rows for clarity
  const displayRows = record.years.slice(0, 10);

  return (
    <main className="flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-[800px]">
        {/* Badge */}
        <VerificationBadge status="tampered" />

        {/* Hash comparison */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Hash Comparison
          </h2>
          <div className="space-y-3 text-sm font-mono">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Stored Hash (original)
              </p>
              <p className="break-all text-gray-700 bg-gray-50 rounded px-3 py-2">
                {record.hash}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Recomputed Hash (tampered data)
              </p>
              <p className="break-all text-red-600 bg-red-50 rounded px-3 py-2">
                {tamperedHash}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  hashMatch
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {hashMatch ? "✓ Hashes match" : "✗ Hashes do not match"}
              </span>
            </div>
          </div>
        </div>

        {/* Data comparison table */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Data Comparison
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Showing first {displayRows.length} rows. The first value has been
            multiplied by 1.8 to simulate tampering.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">
                    Year
                  </th>
                  <th className="text-right py-2 px-3 text-gray-600 font-medium">
                    Original Value
                  </th>
                  <th className="text-right py-2 px-3 text-gray-600 font-medium">
                    Tampered Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((year: number, i: number) => {
                  const isTampered = i === 0;
                  return (
                    <tr
                      key={year}
                      className={`border-b border-gray-100 ${
                        isTampered ? "bg-red-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td
                        className={`py-2 px-3 font-mono ${
                          isTampered ? "text-red-700 font-semibold" : "text-gray-700"
                        }`}
                      >
                        {year}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono ${
                          isTampered ? "text-red-700 font-semibold" : "text-gray-700"
                        }`}
                      >
                        {record.values[i]?.toFixed(4)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono ${
                          isTampered ? "text-red-700 font-semibold" : "text-gray-700"
                        }`}
                      >
                        {tamperedValues[i]?.toFixed(4)}
                        {isTampered && (
                          <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                            modified
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
