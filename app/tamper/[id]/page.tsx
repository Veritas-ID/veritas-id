import { supabaseAdmin } from "@/lib/supabase";
import ChartCard from "@/components/ChartCard";

interface TamperPageProps {
  params: { id: string };
}

export default async function TamperPage({ params }: TamperPageProps) {
  const { id } = params;

  const { data: record, error } = await supabaseAdmin
    .from("veritas_records")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !record) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen py-12 px-4">
        <p className="text-gray-500 text-sm">Record not found.</p>
      </main>
    );
  }

  // Create tampered copy in memory — does NOT modify Supabase
  const tamperedValues = [...record.values];
  tamperedValues[0] = tamperedValues[0] * 1.8;
  const tamperedRecord = { ...record, values: tamperedValues };

  return (
    <main className="flex flex-col items-center py-12 px-4">
      <ChartCard record={tamperedRecord} watermark="DEMO TAMPER VIEW" />
    </main>
  );
}
