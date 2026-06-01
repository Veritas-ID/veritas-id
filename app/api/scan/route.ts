import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

const VID_PATTERN = /VID-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/i;

const VISION_PROMPT = `This is a data verification chart. Your task is to extract the exact data values plotted on the line chart.

Important rules:
- The Y-axis may include negative values. Read the scale carefully — values below the zero line are negative.
- Use the Y-axis gridlines and labels to determine the exact value at each data point dot.
- Do not guess — anchor every reading to the nearest labelled gridline and interpolate carefully.
- Values can be negative. If a data point is below the zero line, its value must be negative.

Return only a valid JSON object, nothing else:
{
  "veritas_id": "the Veritas ID starting with VID-",
  "values": [array of all numerical Y-axis values at each data point, in chronological order left to right, rounded to one decimal place]
}
Example with negative values:
{"veritas_id": "VID-KEN-UNEM-FC7919", "values": [2.6, -1.6, 0.8, 1.9, 2.2, -6.4, 1.1, 4.3, 3.3, 4.1]}`;

interface ClaudeVisionResult {
  veritas_id: string;
  values: number[];
}

interface Discrepancy {
  index: number;
  year: number;
  stored: number;
  extracted: number;
}

type Confidence = "high" | "medium" | "low";

const ABSOLUTE_TOLERANCE = 1.0;
const PERCENTAGE_TOLERANCE = 0.15; // 15%
const MIN_DISCREPANCIES_TO_FLAG = 2;

function compareValues(
  stored: number[],
  extracted: number[],
  years: number[]
): {
  tampered: boolean;
  discrepancies: Discrepancy[];
  confidence: Confidence;
  matched_values: number;
  total_values: number;
} {
  const discrepancies: Discrepancy[] = [];
  const len = Math.min(stored.length, extracted.length);

  for (let i = 0; i < len; i++) {
    const diff = Math.abs(stored[i] - extracted[i]);
    const percentDiff = stored[i] !== 0 ? diff / Math.abs(stored[i]) : diff;

    // Flag if both absolute and percentage thresholds are exceeded
    if (diff > ABSOLUTE_TOLERANCE && percentDiff > PERCENTAGE_TOLERANCE) {
      discrepancies.push({
        index: i,
        year: years[i] ?? i,
        stored: stored[i],
        extracted: extracted[i],
      });
    }
  }

  // Require at least 2 discrepancies before flagging as tampered
  const tampered = discrepancies.length >= MIN_DISCREPANCIES_TO_FLAG;
  const matched_values = len - discrepancies.length;
  const matchRate = len > 0 ? matched_values / len : 1;

  let confidence: Confidence;
  if (matchRate >= 0.9) {
    confidence = "high";
  } else if (matchRate >= 0.7) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return { tampered, discrepancies, confidence, matched_values, total_values: len };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { base64, mediaType } = body as {
      base64: string;
      mediaType: "image/png" | "image/jpeg";
    };

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Single Claude Vision call — extracts both veritas_id and values
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/png" | "image/jpeg",
                data: base64,
              },
            },
            { type: "text", text: VISION_PROMPT },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const rawText = textBlock ? textBlock.text.trim() : "";

    // Strip markdown code fences if present
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    // Parse Claude's JSON response
    let visionResult: ClaudeVisionResult;
    try {
      visionResult = JSON.parse(cleaned) as ClaudeVisionResult;
    } catch {
      return NextResponse.json({
        success: false,
        reason:
          "Could not find a Veritas ID in this image. Make sure the full chart card is visible.",
      });
    }

    // Validate the extracted veritas_id
    const vidMatch = visionResult.veritas_id?.match(VID_PATTERN);
    if (!vidMatch) {
      return NextResponse.json({
        success: false,
        reason:
          "Could not find a Veritas ID in this image. Make sure the full chart card is visible.",
      });
    }

    const extractedId = vidMatch[0].toUpperCase();
    const extractedValues: number[] = Array.isArray(visionResult.values)
      ? visionResult.values.map(Number)
      : [];

    // Supabase lookup
    const { data, error } = await supabaseAdmin
      .from("veritas_records")
      .select("*")
      .eq("id", extractedId)
      .single();

    if (error || !data) {
      return NextResponse.json({
        success: false,
        reason: `No record found for Veritas ID ${extractedId}. This chart may not have been generated by Veritas ID.`,
      });
    }

    // Compare extracted values against stored values
    const storedValues = data.values as number[];
    const { tampered, discrepancies, confidence, matched_values, total_values } = compareValues(
      storedValues,
      extractedValues,
      data.years as number[]
    );

    return NextResponse.json({
      success: true,
      id: extractedId,
      tampered,
      confidence,
      matched_values,
      total_values,
      extracted_values: extractedValues,
      stored_values: data.values,
      discrepancies,
      record: data,
    });
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
