import { NextRequest, NextResponse } from "next/server";
import { parseQuery, generateSummary } from "@/lib/claude";
import { INDICATORS } from "@/lib/indicators";
import { COUNTRIES } from "@/lib/countries";
import { fetchWorldBankData } from "@/lib/worldbank";
import { computeHash } from "@/lib/hash";
import { generateVeritasId } from "@/lib/veritas";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate non-empty query string
    const body = await request.json();
    const { query } = body as { query?: string };

    if (!query || query.trim() === "") {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    // Step 2: Parse query via Claude
    let parsed;
    try {
      parsed = await parseQuery(query);
    } catch {
      return NextResponse.json(
        { error: "Could not understand your query. Try one of the examples." },
        { status: 400 }
      );
    }

    // Step 3: Map indicator
    const indicatorEntry = INDICATORS[parsed.indicator.toLowerCase()];
    if (!indicatorEntry) {
      return NextResponse.json(
        {
          error:
            "Try asking about: unemployment, GDP, literacy, inflation, female labor, CO2, or population.",
        },
        { status: 400 }
      );
    }

    const { code: indicatorCode, label: indicatorLabel, short: indicatorShort } = indicatorEntry;

    // Step 4: Map country (case-insensitive)
    const countryKey = parsed.country.toLowerCase().trim();
    const countryCode = COUNTRIES[countryKey];
    if (!countryCode) {
      return NextResponse.json(
        { error: "Could not understand your query. Try one of the examples." },
        { status: 400 }
      );
    }

    // Derive a display name from the original parsed country (title-cased)
    const countryName = parsed.country
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    // Step 5: Fetch World Bank data
    const dataPoints = await fetchWorldBankData(
      countryCode,
      indicatorCode,
      parsed.startYear,
      parsed.endYear
    );

    if (dataPoints.length === 0) {
      return NextResponse.json(
        { error: "No data available for this query." },
        { status: 400 }
      );
    }

    const years = dataPoints.map((dp) => dp.year);
    const values = dataPoints.map((dp) => dp.value);

    // Step 6: Compute hash
    const hash = computeHash(years, values);

    // Step 7: Generate Veritas ID
    const id = generateVeritasId(countryCode, indicatorShort, hash);

    // Step 8: Generate summary
    const summary = await generateSummary(indicatorLabel, countryName, years, values);

    // Step 9: Insert record into Supabase
    await supabaseAdmin.from("veritas_records").insert({
      id,
      indicator_code: indicatorCode,
      indicator_label: indicatorLabel,
      country_code: countryCode,
      country_name: countryName,
      year_start: years[0],
      year_end: years[years.length - 1],
      years,
      values,
      raw_data_snapshot: dataPoints,
      chart_config: { type: "line", color: "#0057B8", summary },
      hash,
    });

    // Step 10: Return success response
    return NextResponse.json({
      id,
      indicator: indicatorLabel,
      country: countryName,
      years,
      values,
      summary,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
