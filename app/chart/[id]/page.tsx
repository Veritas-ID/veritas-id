import { supabaseAdmin } from "@/lib/supabase";
import ChartCard from "@/components/ChartCard";
import { CopyButton } from "@/components/CopyButton";
import Link from "next/link";

interface ChartPageProps {
  params: { id: string };
}

export default async function ChartPage({ params }: ChartPageProps) {
  const { id } = params;

  const { data: record, error } = await supabaseAdmin
    .from("veritas_records")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !record) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen py-12 px-4">
        <p className="text-gray-500 text-sm">Chart not found.</p>
        <Link href="/" className="mt-4 text-sm text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </main>
    );
  }

  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify/${id}`;

  return (
    <main className="flex flex-col items-center py-12 px-4">
      {/* Back link */}
      <div className="w-full max-w-[800px] mb-6">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back
        </Link>
      </div>

      {/* Chart card */}
      <ChartCard record={record} />

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-6">
        <CopyButton url={verifyUrl} />
        <a
          href="/"
          className="rounded px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Back to Home
        </a>
      </div>
    </main>
  );
}
