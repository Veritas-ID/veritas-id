import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { computeHash } from "@/lib/hash";
import { VerificationBadge } from "@/components/VerificationBadge";
import { MetadataTable } from "@/components/MetadataTable";
import ChartCard from "@/components/ChartCard";

interface VerifyPageProps {
  params: { id: string };
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { data: record, error } = await supabaseAdmin
    .from("veritas_records")
    .select("*")
    .eq("id", params.id)
    .single();

  // State 1: Record not found
  if (error || !record) {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-[800px]">
          <VerificationBadge status="not-found" />
          <div className="flex justify-center mt-6">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Recompute hash and compare
  const recomputedHash = computeHash(record.years, record.values);
  const isVerified = recomputedHash === record.hash;

  // State 3: Hash mismatch (tampered)
  if (!isVerified) {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-[800px]">
          <VerificationBadge status="tampered" />
          <div className="flex justify-center mt-6">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // State 2: Verified
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-[800px] flex flex-col gap-8">
        <VerificationBadge status="verified" />

        <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <MetadataTable record={record} />
        </section>

        <ChartCard record={record} />

        <div className="flex justify-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
