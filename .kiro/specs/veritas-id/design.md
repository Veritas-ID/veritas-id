# Design Document: Veritas ID

## Overview

Veritas ID is a Next.js 14 (App Router) full-stack web application that lets users ask natural language questions about World Bank data, generates a cryptographically-identified chart card, and provides a public verification page to confirm data authenticity. The application uses Claude for NLP query parsing and summary generation, the World Bank REST API for real data, Supabase (PostgreSQL) for record persistence, and Recharts for chart rendering.

The core trust mechanism is a SHA256 hash of the chart's data arrays stored alongside the record. Any modification to the data produces a different hash, which the verification page detects and flags.

---

## Architecture

```
Browser
  │
  ├── / (Query Page — Client Component)
  │     └── POST /api/query
  │           ├── Claude API (query parse)
  │           ├── World Bank API (data fetch)
  │           ├── Claude API (summary generate)
  │           └── Supabase (insert record)
  │
  ├── /chart/[id] (Chart Page — Server Component)
  │     └── Supabase (read record)
  │
  ├── /verify/[id] (Verification Page — Server Component)
  │     └── GET /api/verify/[id]
  │           └── Supabase (read record + hash compare)
  │
  ├── /tamper/[id] (Tamper Demo — Server Component)
  │     └── Supabase (read record, mutate in memory)
  │
  └── /verify/tampered/[id] (Tamper Verify — Server Component)
        └── Supabase (read record, mutate in memory, hash compare)
```

**Rendering strategy:**
- Server Components: `/chart/[id]`, `/verify/[id]`, `/tamper/[id]`, `/verify/tampered/[id]`
- Client Components: `/` (query form with state), `CopyButton` (clipboard API), `ExampleQueries` (click-to-fill)
- API Routes: `/api/query` (POST), `/api/verify/[id]` (GET)

---

## Folder Structure

```
/app
  /page.tsx                          — Query page (client component)
  /chart/[id]/page.tsx               — Chart page (server component)
  /verify/[id]/page.tsx              — Verification page (server component)
  /verify/tampered/[id]/page.tsx     — Tamper verification (server component)
  /tamper/[id]/page.tsx              — Tamper demo view (server component)
  /api/query/route.ts                — POST handler
  /api/verify/[id]/route.ts          — GET handler
/lib
  /supabase.ts                       — Supabase client (schema comment at top)
  /indicators.ts                     — INDICATORS map
  /countries.ts                      — COUNTRIES map
  /worldbank.ts                      — World Bank API fetcher + parser
  /hash.ts                           — SHA256 hash utility
  /veritas.ts                        — Veritas ID generator
  /claude.ts                         — Claude API calls (parse + summarize)
/components
  /ChartCard.tsx                     — Main chart + footer card (server)
  /VerificationBadge.tsx             — ✅ or ⚠️ badge component (server)
  /QRCode.tsx                        — QR code renderer (server)
  /MetadataTable.tsx                 — Verification metadata display (server)
  /CopyButton.tsx                    — Copy link button (client)
  /ExampleQueries.tsx                — Clickable example queries (client)
  /QueryForm.tsx                     — Query input + submit form (client)
```

---

## Data Models

### VeritasRecord (matches Supabase schema)

```typescript
interface VeritasRecord {
  id: string;                    // e.g. "VID-KEN-UNEM-8A4F2B"
  indicator_code: string;        // e.g. "SL.UEM.1524.ZS"
  indicator_label: string;       // e.g. "Youth Unemployment"
  country_code: string;          // e.g. "KEN"
  country_name: string;          // e.g. "Kenya"
  year_start: number;            // e.g. 2014
  year_end: number;              // e.g. 2024
  years: number[];               // e.g. [2014, 2015, ..., 2024]
  values: number[];              // e.g. [17.2, 16.8, ...]
  raw_data_snapshot: unknown;    // full World Bank API response
  chart_config: Record<string, unknown>; // chart rendering config
  hash: string;                  // SHA256 hex string
  created_at: string;            // ISO 8601 timestamp
  summary?: string;              // one-sentence AI summary (stored in chart_config)
}
```

### ClaudeQueryResult

```typescript
interface ClaudeQueryResult {
  indicator: string;   // e.g. "youth unemployment"
  country: string;     // e.g. "Kenya"
  startYear: number;
  endYear: number;
}
```

### WorldBankDataPoint

```typescript
interface WorldBankDataPoint {
  year: number;
  value: number;
}
```

### QueryApiResponse

```typescript
interface QueryApiResponse {
  id: string;
  indicator: string;
  country: string;
  years: number[];
  values: number[];
  summary: string;
}
```

### VerifyApiResponse

```typescript
interface VerifyApiResponse {
  verified: boolean;
  record: VeritasRecord | null;
}
```

---

## Component Designs

### `/lib/indicators.ts`

```typescript
export const INDICATORS: Record<string, { code: string; label: string; short: string }> = {
  "youth unemployment":          { code: "SL.UEM.1524.ZS",    label: "Youth Unemployment",                  short: "UNEM" },
  "gdp growth":                  { code: "NY.GDP.MKTP.KD.ZG", label: "GDP Growth",                          short: "GDP"  },
  "literacy rate":               { code: "SE.ADT.LITR.ZS",    label: "Adult Literacy Rate",                 short: "LITR" },
  "inflation":                   { code: "FP.CPI.TOTL.ZG",    label: "Inflation Rate",                      short: "INFL" },
  "female labor participation":  { code: "SL.TLF.ACTI.FE.ZS", label: "Female Labor Force Participation",    short: "FLAB" },
  "co2 emissions":               { code: "EN.ATM.CO2E.PC",    label: "CO2 Emissions per Capita",            short: "CO2"  },
  "population growth":           { code: "SP.POP.GROW",       label: "Population Growth",                   short: "POPG" },
};
```

### `/lib/countries.ts`

```typescript
export const COUNTRIES: Record<string, string> = {
  "kenya": "KEN", "uganda": "UGA", "tanzania": "TZA", "nigeria": "NGA",
  "ghana": "GHA", "south africa": "ZAF", "ethiopia": "ETH", "rwanda": "RWA",
  "egypt": "EGY", "united states": "USA", "united kingdom": "GBR",
  "china": "CHN", "india": "IND", "brazil": "BRA", "germany": "DEU",
};
```

Lookup is case-insensitive: `COUNTRIES[country.toLowerCase().trim()]`.

### `/lib/hash.ts`

```typescript
import { createHash } from "crypto";

export function computeHash(years: number[], values: number[]): string {
  const payload = JSON.stringify({ years, values });
  return createHash("sha256").update(payload).digest("hex");
}
```

### `/lib/veritas.ts`

```typescript
import { computeHash } from "./hash";

export function generateVeritasId(
  countryCode: string,
  indicatorShort: string,
  hash: string
): string {
  const prefix = hash.slice(0, 6).toUpperCase();
  return `VID-${countryCode}-${indicatorShort}-${prefix}`;
}
```

### `/lib/worldbank.ts`

```typescript
export async function fetchWorldBankData(
  countryCode: string,
  indicatorCode: string,
  startYear: number,
  endYear: number
): Promise<WorldBankDataPoint[]>
```

- Fetches from `https://api.worldbank.org/v2/country/{countryCode}/indicator/{indicatorCode}?date={startYear}:{endYear}&format=json&per_page=100`
- Parses `response[1]` array (World Bank wraps data in index 1)
- Maps each entry to `{ year: Number(entry.date), value: entry.value }`
- Filters out entries where `value === null`
- Sorts ascending by year
- Returns empty array (not throws) on malformed response

### `/lib/claude.ts`

```typescript
// Call 1: Parse query
export async function parseQuery(query: string): Promise<ClaudeQueryResult>

// Call 2: Generate summary
export async function generateSummary(
  indicatorLabel: string,
  countryName: string,
  years: number[],
  values: number[]
): Promise<string>
```

**parseQuery system prompt:**
> "You are a data query interpreter for a World Bank data visualization tool. Extract the indicator type, country, and year range from the user's natural language query. Return only valid JSON in this exact format: {indicator: one of [youth unemployment, gdp growth, literacy rate, inflation, female labor participation, co2 emissions, population growth], country: country name as written, startYear: number, endYear: number}. If anything is unclear, make your best guess. Default year range is last 10 years if not specified. Default country is Kenya if not specified."

**generateSummary system prompt:**
> "You are a data analyst. Given World Bank indicator data, write exactly one sentence summarizing the key trend. Be specific with numbers. Do not use markdown."

### `/lib/supabase.ts`

Exports two clients:
- `supabaseAdmin` — uses `SUPABASE_SERVICE_ROLE_KEY`, server-side only
- `supabaseClient` — uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`, safe for client reads

SQL schema comment at top of file (copy-paste into Supabase SQL editor):

```sql
-- Run once in Supabase SQL editor:
-- CREATE TABLE veritas_records (
--   id text PRIMARY KEY,
--   indicator_code text NOT NULL,
--   indicator_label text NOT NULL,
--   country_code text NOT NULL,
--   country_name text NOT NULL,
--   year_start integer NOT NULL,
--   year_end integer NOT NULL,
--   years jsonb NOT NULL,
--   values jsonb NOT NULL,
--   raw_data_snapshot jsonb,
--   chart_config jsonb,
--   hash text NOT NULL,
--   created_at timestamptz NOT NULL DEFAULT now()
-- );
```

---

## API Route Designs

### `POST /api/query`

```
Input:  { query: string }
Output: { id, indicator, country, years, values, summary }
        | { error: string }

Steps:
1. Validate input — query must be non-empty string
2. Call claude.parseQuery(query) → ClaudeQueryResult
   - On JSON parse failure → return 400 { error: "Could not understand your query. Try one of the examples." }
3. Map result.indicator → INDICATORS entry
   - On miss → return 400 { error: "Try asking about: unemployment, GDP, literacy, inflation, female labor, CO2, or population." }
4. Map result.country.toLowerCase() → COUNTRIES entry
   - On miss → return 400 { error: "Could not understand your query. Try one of the examples." }
5. Call worldbank.fetchWorldBankData(countryCode, indicatorCode, startYear, endYear)
   - On empty result → return 400 { error: "No data available for this query." }
6. Compute hash = computeHash(years, values)
7. Generate id = generateVeritasId(countryCode, indicatorShort, hash)
8. Call claude.generateSummary(indicatorLabel, countryName, years, values) → summary
9. Insert into supabase veritas_records via supabaseAdmin
10. Return 200 { id, indicator: indicatorLabel, country: countryName, years, values, summary }
```

### `GET /api/verify/[id]`

```
Input:  id (path param)
Output: { verified: boolean, record: VeritasRecord | null }

Steps:
1. Query supabase veritas_records WHERE id = param
2. If not found → return 200 { verified: false, record: null }
3. Recompute hash = computeHash(record.years, record.values)
4. verified = (recomputedHash === record.hash)
5. Return 200 { verified, record }
```

---

## Page Designs

### `/app/page.tsx` — Query Page

Client component. State: `query: string`, `loading: boolean`, `error: string | null`.

```
Layout:
  <main> centered, full height
    <h1> "Veritas ID"
    <p>  "Verify the data behind every chart"
    <QueryForm />        ← client component
    <ExampleQueries />   ← client component
```

`QueryForm` handles submit: calls `POST /api/query`, on success navigates to `/chart/{id}` via `router.push`.

`ExampleQueries` renders three clickable `<button>` elements that call a prop `onSelect(query)` to fill the input.

### `/app/chart/[id]/page.tsx` — Chart Page

Server component. Fetches record from Supabase directly (no API route needed).

```
Layout:
  <main> centered, py-12
    <ChartCard record={record} />
    <div> action buttons row
      <CopyButton url={verifyUrl} />   ← client component
      <a href="/"> "Back to Home"
```

### `/components/ChartCard.tsx`

Server component. Renders the full card.

```
<div> white card, max-w-[800px], shadow-sm, border border-gray-200, rounded-lg, p-8
  <h2> title: "{indicatorLabel} — {countryName}, {yearStart}–{yearEnd}"
  <LineChart> (Recharts, static, #0057B8 line)
  <p> summary text
  <hr> divider
  <div> footer row
    <div> left: Veritas ID (monospace), source, timestamp
    <div> right: <QRCode id={id} />
```

The Recharts `LineChart` is rendered inside a `ResponsiveContainer` with `width="100%"` and a fixed `height={300}`. Since this is a server component, Recharts must be imported with `"use client"` in a thin wrapper component `ChartRenderer.tsx`.

**Note:** Recharts requires a client boundary. Create `/components/ChartRenderer.tsx` as a `"use client"` component that wraps only the Recharts primitives. `ChartCard.tsx` remains a server component and passes serializable props to `ChartRenderer`.

### `/components/QRCode.tsx`

Server component. Uses `qrcode` package server-side.

```typescript
import QRCodeLib from "qrcode";

export async function QRCode({ id }: { id: string }) {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/verify/${id}`;
  const dataUrl = await QRCodeLib.toDataURL(url, { width: 120, margin: 1 });
  return <img src={dataUrl} alt="QR Code" width={80} height={80} />;
}
```

### `/app/verify/[id]/page.tsx` — Verification Page

Server component. Calls `/api/verify/[id]` (or directly calls the verify logic).

```
If verified:
  <VerificationBadge status="verified" />
  <MetadataTable record={record} />
  <ChartCard record={record} readonly />

If not found:
  <VerificationBadge status="not-found" />
  <p> "No record found for this Veritas ID"

If hash mismatch (future-proofing):
  <VerificationBadge status="tampered" />
```

### `/components/VerificationBadge.tsx`

```typescript
type BadgeStatus = "verified" | "tampered" | "not-found";

// verified  → green/blue ✅ "Verified"
// tampered  → red ⚠️ "Modified — Cannot Verify"
// not-found → yellow ⚠️ "Cannot Verify"
```

### `/app/tamper/[id]/page.tsx` — Tamper Demo

Server component. Loads record, creates tampered copy in memory:

```typescript
const tamperedValues = [...record.values];
tamperedValues[0] = tamperedValues[0] * 1.8;
const tamperedRecord = { ...record, values: tamperedValues };
```

Renders `<ChartCard record={tamperedRecord} />` with a watermark overlay:

```
<div> relative
  <ChartCard record={tamperedRecord} />
  <span> absolute, bottom-4, right-4, text-gray-200, text-xs, select-none
    "DEMO TAMPER VIEW"
```

### `/app/verify/tampered/[id]/page.tsx` — Tamper Verification

Server component. Loads record, tampers first value, recomputes hash, compares:

```typescript
const tamperedValues = [...record.values];
tamperedValues[0] = tamperedValues[0] * 1.8;
const tamperedHash = computeHash(record.years, tamperedValues);
const hashMatch = tamperedHash === record.hash; // always false
```

Renders:
- `<VerificationBadge status="tampered" />`
- Comparison table: original values vs tampered values (first row highlighted in red)

---

## Error Handling Strategy

| Scenario | Handler | User-facing message |
|---|---|---|
| Claude returns invalid JSON | `claude.ts` try/catch | "Could not understand your query. Try one of the examples." |
| Indicator not in INDICATORS map | `route.ts` lookup | "Try asking about: unemployment, GDP, literacy, inflation, female labor, CO2, or population." |
| Country not in COUNTRIES map | `route.ts` lookup | "Could not understand your query. Try one of the examples." |
| World Bank returns empty data | `worldbank.ts` | "No data available for this query." |
| World Bank returns malformed response | `worldbank.ts` try/catch | Returns empty array → triggers "No data available" |
| Supabase insert fails | `route.ts` try/catch | 500 with generic error |
| Chart page: id not found | `page.tsx` | Inline "Chart not found" message |
| Verify page: id not found | `api/verify` | `{ verified: false, record: null }` |

All errors are shown inline. No page crashes. No unhandled promise rejections.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Indicator mapping is total over supported inputs

For any string that is a key in the INDICATORS map, the mapping function SHALL return a non-null indicator object with `code`, `label`, and `short` fields.

**Validates: Requirements 1.2**

---

### Property 2: Country mapping is total over supported inputs

For any string that is a key in the COUNTRIES map (case-insensitive), the mapping function SHALL return a non-null country code string.

**Validates: Requirements 1.2**

---

### Property 3: Unsupported indicator strings produce an error response

For any string that is NOT a key in the INDICATORS map, the query handler SHALL return an error response (not a successful chart record).

**Validates: Requirements 1.4**

---

### Property 4: Unsupported country strings produce an error response

For any string that is NOT a key in the COUNTRIES map, the query handler SHALL return an error response (not a successful chart record).

**Validates: Requirements 1.5**

---

### Property 5: World Bank data parser produces sorted, non-null output

For any array of World Bank API response objects (including objects with null values, missing fields, or out-of-order dates), the parser SHALL return an array where all values are non-null numbers and years are in strictly ascending order.

**Validates: Requirements 2.2**

---

### Property 6: World Bank data parser never throws on malformed input

For any value passed as the World Bank API response (including null, undefined, non-array, empty array, or objects with unexpected shapes), the parser SHALL return an array (possibly empty) without throwing an exception.

**Validates: Requirements 2.4**

---

### Property 7: Hash computation is deterministic

For any years array and values array, calling `computeHash(years, values)` twice SHALL produce the same hex string both times.

**Validates: Requirements 3.1**

---

### Property 8: Hash detects data modification

For any years array and values array, if any element of values is changed (including multiplying the first element by 1.8), the resulting hash SHALL differ from the hash of the original data.

**Validates: Requirements 3.1, 6.5, 7.6**

---

### Property 9: Veritas ID format is always valid

For any country code, indicator short string, and SHA256 hash string, `generateVeritasId` SHALL return a string matching the regex `^VID-[A-Z]+-[A-Z]+-[A-F0-9]{6}$`.

**Validates: Requirements 3.2**

---

### Property 10: Query API response always contains required fields

For any successful query (valid indicator, valid country, non-empty World Bank data), the API response SHALL contain all of: `id`, `indicator`, `country`, `years`, `values`, and `summary` as non-null fields.

**Validates: Requirements 3.6**

---

### Property 11: Verification of unmodified data always succeeds

For any Veritas Record stored in the database, recomputing the hash from the stored `years` and `values` arrays SHALL produce a hash equal to the stored `hash` field.

**Validates: Requirements 6.2, 6.3**

---

### Property 12: Tampered data always fails verification

For any Veritas Record, multiplying the first element of `values` by 1.8 and recomputing the hash SHALL produce a hash that does NOT equal the stored `hash` field.

**Validates: Requirements 7.6**

---

### Property 13: Chart title format is always correct

For any Veritas Record, the rendered chart title SHALL match the pattern `"{indicatorLabel} — {countryName}, {yearStart}–{yearEnd}"` using the record's fields.

**Validates: Requirements 4.2**

---

### Property 14: QR code encodes the correct verification URL

For any Veritas ID string, the QR code generated by the QRCode component SHALL encode the URL `{NEXT_PUBLIC_BASE_URL}/verify/{id}` and no other URL.

**Validates: Requirements 5.2**
