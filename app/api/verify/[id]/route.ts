import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeHash } from "@/lib/hash";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("veritas_records")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ verified: false, record: null });
    }

    const recomputedHash = computeHash(data.years, data.values);
    const verified = recomputedHash === data.hash;

    return NextResponse.json({ verified, record: data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
