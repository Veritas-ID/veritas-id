import Anthropic from "@anthropic-ai/sdk";

export interface ClaudeQueryResult {
  indicator: string;
  country: string;
  startYear: number;
  endYear: number;
}

const PARSE_QUERY_SYSTEM_PROMPT =
  'You are a data query interpreter for a World Bank data visualization tool. Extract the indicator type, country, and year range from the user\'s natural language query. Return only valid JSON in this exact format: {"indicator": "one of [youth unemployment, gdp growth, literacy rate, inflation, female labor participation, co2 emissions, population growth]", "country": "country name as written", "startYear": number, "endYear": number}. If anything is unclear, make your best guess. Default year range is last 10 years if not specified. Default country is Kenya if not specified.';

const GENERATE_SUMMARY_SYSTEM_PROMPT =
  "You are a data analyst. Given World Bank indicator data, write exactly one sentence summarizing the key trend. Be specific with numbers. Do not use markdown.";

export async function parseQuery(query: string): Promise<ClaudeQueryResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 256,
    system: PARSE_QUERY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: query }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const rawText = textBlock ? textBlock.text : "";

  // Strip markdown code fences if Claude wraps the JSON
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as ClaudeQueryResult;
    return parsed;
  } catch {
    throw new Error("PARSE_ERROR");
  }
}

export async function generateSummary(
  indicatorLabel: string,
  countryName: string,
  years: number[],
  values: number[]
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `Indicator: ${indicatorLabel}\nCountry: ${countryName}\nYears: ${years.join(", ")}\nValues: ${values.join(", ")}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 256,
    system: GENERATE_SUMMARY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text.trim() : "";
}
