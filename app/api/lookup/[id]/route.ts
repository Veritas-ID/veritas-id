import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const VERITAS_ID_PATTERN = /^VID-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/i;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate the ID format
    if (!id || !VERITAS_ID_PATTERN.test(id)) {
      return NextResponse.json(
        { success: false, reason: "Invalid Veritas ID format." },
        { status: 400 }
      );
    }

    // Query Supabase for the record
    const { data, error } = await supabaseAdmin
      .from("veritas_records")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, reason: "No record found for this Veritas ID." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, record: data },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        reason: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}
