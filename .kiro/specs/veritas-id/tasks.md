# Implementation Plan: Veritas ID

## Overview

Build a Next.js 14 (App Router) full-stack web application that lets users query World Bank data via natural language, generates a cryptographically-identified chart card with a Veritas ID and QR code, and provides a public verification page to confirm data authenticity. The tamper demo flow shows how modified data fails verification.

## Tasks

- [x] 1. Initialize Next.js project and configure dependencies
  - Run `npx create-next-app@14 . --typescript --tailwind --app --no-src-dir --import-alias "@/*"` in the workspace root
  - Install additional dependencies: `@supabase/supabase-js@^2`, `@anthropic-ai/sdk@^0.20.0`, `recharts@^2`, `qrcode@^1.5.3`, `@types/qrcode`
  - Create `.env.local` with all five required environment variable keys (empty values as placeholders)
  - Configure `tailwind.config.ts` to include the `#0057B8` and `#DC2626` accent colors
  - _Requirements: 9.4, 10.1_

- [x] 2. Implement core library utilities
  - [x] 2.1 Create `/lib/indicators.ts` with the full INDICATORS map (7 entries with code, label, short)
    - Export `INDICATORS` as a typed `Record<string, { code: string; label: string; short: string }>`
    - _Requirements: 1.2_

  - [x] 2.2 Create `/lib/countries.ts` with the full COUNTRIES map (15 entries)
    - Export `COUNTRIES` as a typed `Record<string, string>` (lowercase key → ISO code)
    - _Requirements: 1.2_

  - [ ]* 2.3 Write property tests for indicator and country mapping
    - **Property 1: Indicator mapping is total over supported inputs**
    - **Property 2: Country mapping is total over supported inputs**
    - **Property 3: Unsupported indicator strings produce an error response**
    - **Property 4: Unsupported country strings produce an error response**
    - **Validates: Requirements 1.2, 1.4, 1.5**

  - [x] 2.4 Create `/lib/hash.ts` with `computeHash(years, values)` using Node.js `crypto` module
    - Input: `years: number[]`, `values: number[]`
    - Computes SHA256 of `JSON.stringify({ years, values })` and returns hex string
    - _Requirements: 3.1_

  - [ ]* 2.5 Write property tests for hash utility
    - **Property 7: Hash computation is deterministic**
    - **Property 8: Hash detects data modification**
    - **Validates: Requirements 3.1, 6.5, 7.6**

  - [x] 2.6 Create `/lib/veritas.ts` with `generateVeritasId(countryCode, indicatorShort, hash)`
    - Returns string in format `VID-{COUNTRY_CODE}-{INDICATOR_SHORT}-{FIRST_6_CHARS_OF_HASH_UPPERCASE}`
    - _Requirements: 3.2_

  - [ ]* 2.7 Write property test for Veritas ID format
    - **Property 9: Veritas ID format is always valid**
    - **Validates: Requirements 3.2**

- [x] 3. Checkpoint — Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement World Bank API fetcher
  - [x] 4.1 Create `/lib/worldbank.ts` with `fetchWorldBankData(countryCode, indicatorCode, startYear, endYear)`
    - Fetches from `https://api.worldbank.org/v2/country/{countryCode}/indicator/{indicatorCode}?date={startYear}:{endYear}&format=json&per_page=100`
    - Parses `response[1]` array, maps to `{ year: number, value: number }` pairs
    - Filters out null values, sorts ascending by year
    - Returns empty array (never throws) on malformed or missing response
    - Export `WorldBankDataPoint` interface
    - _Requirements: 2.1, 2.2, 2.4_

  - [ ]* 4.2 Write property tests for World Bank data parser
    - **Property 5: World Bank data parser produces sorted, non-null output**
    - **Property 6: World Bank data parser never throws on malformed input**
    - **Validates: Requirements 2.2, 2.4**

- [x] 5. Implement Claude API integration
  - [x] 5.1 Create `/lib/claude.ts` with `parseQuery(query: string): Promise<ClaudeQueryResult>`
    - Uses `@anthropic-ai/sdk` with model `claude-sonnet-4-20250514`
    - System prompt as specified in design
    - Parses response text as JSON; throws a typed error on parse failure
    - Export `ClaudeQueryResult` interface: `{ indicator, country, startYear, endYear }`
    - _Requirements: 1.1, 1.3_

  - [x] 5.2 Add `generateSummary(indicatorLabel, countryName, years, values): Promise<string>` to `/lib/claude.ts`
    - Second Claude call with data context
    - System prompt: "You are a data analyst. Given World Bank indicator data, write exactly one sentence summarizing the key trend. Be specific with numbers. Do not use markdown."
    - Returns the summary string
    - _Requirements: 3.3_

- [x] 6. Implement Supabase client
  - [x] 6.1 Create `/lib/supabase.ts` with SQL schema comment at the top and two exported clients
    - `supabaseAdmin` using `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
    - `supabaseClient` using `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for client reads)
    - SQL schema comment includes the full `CREATE TABLE veritas_records (...)` statement
    - _Requirements: 9.2, 9.3, 11.1, 11.2, 11.3_

- [x] 7. Implement POST /api/query route
  - [x] 7.1 Create `/app/api/query/route.ts` implementing the full 10-step query pipeline
    - Step 1: Validate non-empty query string
    - Step 2: Call `parseQuery` → handle JSON parse error → return 400 with "Could not understand your query. Try one of the examples."
    - Step 3: Map indicator → handle miss → return 400 with "Try asking about: unemployment, GDP, literacy, inflation, female labor, CO2, or population."
    - Step 4: Map country (case-insensitive) → handle miss → return 400 with "Could not understand your query. Try one of the examples."
    - Step 5: Call `fetchWorldBankData` → handle empty result → return 400 with "No data available for this query."
    - Step 6: Call `computeHash(years, values)`
    - Step 7: Call `generateVeritasId(countryCode, indicatorShort, hash)`
    - Step 8: Call `generateSummary(indicatorLabel, countryName, years, values)`
    - Step 9: Insert record into `veritas_records` via `supabaseAdmin`
    - Step 10: Return 200 `{ id, indicator, country, years, values, summary }`
    - _Requirements: 1.1–1.7, 2.1–2.4, 3.1–3.6, 9.1_

  - [ ]* 7.2 Write property test for query API response shape
    - **Property 10: Query API response always contains required fields**
    - **Validates: Requirements 3.6**

- [x] 8. Implement GET /api/verify/[id] route
  - [x] 8.1 Create `/app/api/verify/[id]/route.ts`
    - Query `veritas_records` by id using `supabaseAdmin`
    - If not found: return `{ verified: false, record: null }`
    - Recompute hash from stored `years` and `values`
    - Compare to stored `hash`; set `verified = (recomputedHash === record.hash)`
    - Return `{ verified, record }`
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ]* 8.2 Write property tests for verification logic
    - **Property 11: Verification of unmodified data always succeeds**
    - **Property 12: Tampered data always fails verification**
    - **Validates: Requirements 6.2, 6.3, 7.6**

- [x] 9. Checkpoint — Ensure all API route tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Build shared UI components
  - [x] 10.1 Create `/components/ChartRenderer.tsx` as a `"use client"` component
    - Wraps Recharts `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `ResponsiveContainer`
    - Props: `years: number[]`, `values: number[]`
    - Line color: `#0057B8`, no animation, no tooltip (static/screenshot-optimized)
    - Fixed height 300px, width 100%
    - _Requirements: 4.3_

  - [x] 10.2 Create `/components/QRCode.tsx` as a server component
    - Uses `qrcode` npm package server-side via `QRCodeLib.toDataURL`
    - Encodes `${process.env.NEXT_PUBLIC_BASE_URL}/verify/${id}`
    - Renders `<img>` with `width={80}` `height={80}` and `alt="QR Code"`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 10.3 Write property test for QR code URL encoding
    - **Property 14: QR code encodes the correct verification URL**
    - **Validates: Requirements 5.2**

  - [x] 10.4 Create `/components/VerificationBadge.tsx` as a server component
    - Accepts `status: "verified" | "tampered" | "not-found"`
    - `verified`: blue/green ✅ badge with text "Verified"
    - `tampered`: red ⚠️ badge with text "Modified — Cannot Verify"
    - `not-found`: yellow ⚠️ badge with text "Cannot Verify"
    - _Requirements: 6.4, 6.6, 7.7_

  - [x] 10.5 Create `/components/MetadataTable.tsx` as a server component
    - Accepts a `VeritasRecord` and renders a clean table with: Veritas ID, Indicator, Country, Year Range, Source, Timestamp
    - _Requirements: 6.4_

  - [x] 10.6 Create `/components/ChartCard.tsx` as a server component
    - Accepts `record: VeritasRecord` and optional `watermark?: string`
    - Renders: title, `<ChartRenderer>`, summary, `<hr>`, footer row (left: ID + source + timestamp, right: `<QRCode>`)
    - Title format: `"{indicatorLabel} — {countryName}, {yearStart}–{yearEnd}"`
    - White card, `max-w-[800px]`, `shadow-sm`, `border border-gray-200`, `rounded-lg`, `p-8`
    - If `watermark` prop provided, renders it as absolute-positioned light grey text in bottom-right corner
    - _Requirements: 4.1–4.7_

  - [ ]* 10.7 Write property test for chart title format
    - **Property 13: Chart title format is always correct**
    - **Validates: Requirements 4.2**

  - [x] 10.8 Create `/components/CopyButton.tsx` as a `"use client"` component
    - Accepts `url: string`; on click calls `navigator.clipboard.writeText(url)`
    - Shows "Copied!" feedback for 2 seconds after click
    - Styled with `#0057B8` background
    - _Requirements: 4.8_

  - [x] 10.9 Create `/components/ExampleQueries.tsx` as a `"use client"` component
    - Accepts `onSelect: (query: string) => void`
    - Renders three clickable buttons: "Youth unemployment in Kenya over 10 years", "GDP growth in Nigeria since 2015", "Female labor participation in South Africa"
    - _Requirements: 8.4_

  - [x] 10.10 Create `/components/QueryForm.tsx` as a `"use client"` component
    - State: `query`, `loading`, `error`
    - Renders text input with placeholder "Ask a question about World Bank data..."
    - Renders "Generate Chart" button with `#0057B8` background
    - On submit: calls `POST /api/query`, on success navigates to `/chart/{id}` via `router.push`
    - On error: displays error message inline
    - Exposes `setValue(query: string)` via `useImperativeHandle` or accepts `value` + `onChange` props so `ExampleQueries` can fill it
    - _Requirements: 8.2, 8.3, 8.5, 8.6, 8.7_

- [x] 11. Build application pages
  - [x] 11.1 Create `/app/page.tsx` — Query Page
    - Server component shell; renders `<QueryForm>` and `<ExampleQueries>` as client components
    - Centered layout, full viewport height, generous whitespace
    - `<h1>` "Veritas ID", `<p>` "Verify the data behind every chart"
    - _Requirements: 8.1–8.7_

  - [x] 11.2 Create `/app/chart/[id]/page.tsx` — Chart Page
    - Server component; fetches record from Supabase directly using `supabaseAdmin`
    - If record not found: renders inline "Chart not found" error
    - Renders `<ChartCard record={record} />`
    - Below card: `<CopyButton url={verifyUrl} />` and `<a href="/">Back to Home</a>`
    - _Requirements: 4.1–4.9_

  - [x] 11.3 Create `/app/verify/[id]/page.tsx` — Verification Page
    - Server component; calls `GET /api/verify/{id}` (or direct Supabase + hash logic)
    - If `verified: true`: renders `<VerificationBadge status="verified" />`, `<MetadataTable>`, `<ChartCard>`
    - If `record: null`: renders `<VerificationBadge status="not-found" />` + "No record found for this Veritas ID"
    - If `verified: false` (hash mismatch): renders `<VerificationBadge status="tampered" />`
    - Mobile-responsive layout
    - _Requirements: 6.1–6.7_

  - [x] 11.4 Create `/app/tamper/[id]/page.tsx` — Tamper Demo Page
    - Server component; fetches record from Supabase
    - Creates tampered copy in memory: `tamperedValues[0] *= 1.8`
    - Renders `<ChartCard record={tamperedRecord} watermark="DEMO TAMPER VIEW" />`
    - Not linked from any navigation element
    - _Requirements: 7.1–7.5_

  - [x] 11.5 Create `/app/verify/tampered/[id]/page.tsx` — Tamper Verification Page
    - Server component; fetches record from Supabase
    - Tampers first value in memory, recomputes hash, compares to stored hash
    - Renders `<VerificationBadge status="tampered" />`
    - Renders comparison table: original values vs tampered values, first row highlighted in red
    - _Requirements: 7.6–7.8_

- [x] 12. Apply global styles and design system
  - Update `/app/globals.css` and `tailwind.config.ts` to enforce the design system:
    - White backgrounds, light grey borders (`border-gray-200`), dark grey text (`text-gray-900`)
    - Accent `#0057B8` for buttons and links
    - Red `#DC2626` for error/tampered states
    - Inter or system font stack
    - Subtle card shadows (`shadow-sm`), no gradients
  - Ensure all pages are responsive and render correctly on mobile widths
  - _Requirements: 10.1–10.6_

- [x] 13. Final checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the app starts with `npm run dev` after `.env.local` is populated
  - Confirm the core demo flow works end-to-end: Query → Chart → QR scan → Verify ✅
  - Confirm the tamper demo flow works: `/tamper/[id]` → screenshot → `/verify/tampered/[id]` → ⚠️

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (hash determinism, format validity, parser robustness)
- Unit tests validate specific examples and edge cases
- The Recharts `ChartRenderer` must be a `"use client"` component — all other components are server components
- The SQL schema comment in `/lib/supabase.ts` must be run once in the Supabase SQL editor before the app can store records
- All API keys (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must remain server-side only
