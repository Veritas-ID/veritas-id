# Requirements Document

## Introduction

Veritas ID is a hackathon MVP full-stack web application that enables users to ask natural language questions about World Bank data, receive a generated chart backed by real API data, and obtain a unique cryptographic Veritas ID and QR code embedded in the chart card. Users can share or screenshot the chart card and later verify its authenticity via a public verification page. The application also includes a tamper-demonstration flow that shows how modified data fails verification.

## Glossary

- **Veritas ID**: A unique identifier in the format `VID-[COUNTRY]-[INDICATOR_SHORT]-[FIRST_6_CHARS_OF_SHA256]` assigned to each chart record
- **Chart Card**: The visual component on `/chart/[id]` containing the chart, summary, Veritas ID, QR code, and metadata footer
- **Hash**: A SHA256 digest computed from `JSON.stringify({ years: [...], values: [...] })` used to detect data tampering
- **Veritas Record**: A row in the `veritas_records` Supabase table storing all data and metadata for a generated chart
- **World Bank API**: The public REST API at `https://api.worldbank.org/v2` used to fetch indicator data
- **Claude API**: The Anthropic Claude API (`claude-sonnet-4-20250514`) used for natural language query interpretation and summary generation
- **Indicator**: One of seven supported World Bank data series (youth unemployment, GDP growth, literacy rate, inflation, female labor participation, CO2 emissions, population growth)
- **QR Code**: A machine-readable image encoding the verification URL for a chart record
- **Tamper Demo**: A demonstration flow at `/tamper/[id]` that visually modifies data to show how verification detects changes
- **Query Page**: The home page at `/` where users enter natural language questions
- **Chart Page**: The page at `/chart/[id]` displaying the generated chart card
- **Verification Page**: The page at `/verify/[id]` that confirms or denies chart authenticity
- **Tamper Verification Page**: The page at `/verify/tampered/[id]` that demonstrates failed verification on modified data

---

## Requirements

### Requirement 1: Natural Language Query Interpretation

**User Story:** As a user, I want to type a natural language question about World Bank data, so that I can generate a chart without knowing specific indicator codes or API details.

#### Acceptance Criteria

1. WHEN a user submits a query via the Query Page, THE Query API SHALL call the Claude API with the user's query text to extract the indicator type, country, start year, and end year as structured JSON
2. WHEN the Claude API returns a valid JSON response, THE Query API SHALL map the extracted indicator string to a supported indicator code and the extracted country name to a supported country code
3. IF the Claude API returns malformed or unparseable JSON, THEN THE Query API SHALL return an error response with the message "Could not understand your query. Try one of the examples."
4. IF the extracted indicator does not match any supported indicator, THEN THE Query API SHALL return an error response with the message "Try asking about: unemployment, GDP, literacy, inflation, female labor, CO2, or population."
5. IF the extracted country does not match any supported country, THEN THE Query API SHALL return an error response with the message "Could not understand your query. Try one of the examples."
6. WHEN no year range is specified in the query, THE Query API SHALL default to the last 10 years relative to the current year
7. WHEN no country is specified in the query, THE Query API SHALL default to Kenya

---

### Requirement 2: World Bank Data Fetching

**User Story:** As a user, I want the chart to display real data from the World Bank, so that the information is accurate and trustworthy.

#### Acceptance Criteria

1. WHEN a valid indicator code and country code are resolved, THE Query API SHALL fetch data from `https://api.worldbank.org/v2/country/{countryCode}/indicator/{indicatorCode}?date={startYear}:{endYear}&format=json&per_page=100`
2. WHEN the World Bank API response is received, THE Query API SHALL parse the response, extract year and value pairs, filter out null values, and sort the results by year in ascending order
3. IF the World Bank API returns no data points after filtering, THEN THE Query API SHALL return an error response with the message "No data available for this query."
4. THE Query API SHALL treat the World Bank API response as untrusted external data and handle malformed responses without crashing

---

### Requirement 3: Veritas Record Creation

**User Story:** As a user, I want each chart to have a unique, verifiable identity, so that I can prove the data has not been tampered with.

#### Acceptance Criteria

1. WHEN valid data is fetched from the World Bank API, THE Query API SHALL compute a SHA256 hash from `JSON.stringify({ years: [...], values: [...] })` where years and values are the cleaned, sorted arrays
2. WHEN the hash is computed, THE Query API SHALL generate a Veritas ID in the format `VID-[COUNTRY_CODE]-[INDICATOR_SHORT]-[FIRST_6_CHARS_OF_SHA256_UPPERCASE]`
3. WHEN the Veritas ID is generated, THE Query API SHALL make a second Claude API call with the fetched data to generate a one-sentence plain English summary of the data
4. WHEN the summary is generated, THE Query API SHALL insert a new row into the `veritas_records` Supabase table containing the id, indicator_code, indicator_label, country_code, country_name, year_start, year_end, years, values, raw_data_snapshot, chart_config, hash, and created_at fields
5. THE Query API SHALL always insert a new record regardless of whether an identical query has been processed before
6. WHEN the record is saved, THE Query API SHALL return a JSON response containing `{ id, indicator, country, years, values, summary }`

---

### Requirement 4: Chart Page Display

**User Story:** As a user, I want to view a polished chart card that I can screenshot and share, so that I can communicate data insights with a verifiable source.

#### Acceptance Criteria

1. WHEN a user navigates to `/chart/[id]`, THE Chart Page SHALL fetch the Veritas Record from Supabase by the given id and render a white card with a maximum width of 800px centered on the page
2. THE Chart Page SHALL render a chart title in the format "[Indicator Label] — [Country Name], [year_start]–[year_end]"
3. THE Chart Page SHALL render a static Recharts LineChart with years on the X-axis, values on the Y-axis, and the line color set to `#0057B8`
4. THE Chart Page SHALL display the one-sentence AI-generated summary below the chart
5. THE Chart Page SHALL render a divider line separating the chart area from the verification footer
6. THE Chart Page SHALL render a verification footer containing: the label "Veritas ID:", the id value in monospace font, the text "Source: World Bank Data360", and the record's created_at timestamp
7. THE Chart Page SHALL render a QR code image of at least 80×80 pixels in the verification footer, encoding the URL `{NEXT_PUBLIC_BASE_URL}/verify/{id}`
8. THE Chart Page SHALL render a "Copy Verification Link" button styled in `#0057B8` and a "Back to Home" button styled in grey below the card
9. IF the id does not exist in Supabase, THEN THE Chart Page SHALL display an error message without crashing

---

### Requirement 5: QR Code Generation

**User Story:** As a user, I want a QR code on the chart card, so that anyone with a phone can quickly navigate to the verification page.

#### Acceptance Criteria

1. WHEN a chart record is rendered on the Chart Page, THE QR Code Component SHALL generate a QR code as a base64 PNG data URL using the `qrcode` npm package on the server side
2. THE QR Code Component SHALL encode the URL `{NEXT_PUBLIC_BASE_URL}/verify/{id}` in the QR code
3. THE QR Code Component SHALL render the QR code as an `<img>` tag with a minimum width and height of 80 pixels
4. THE QR Code Component SHALL never expose the QR generation logic to the client bundle

---

### Requirement 6: Chart Verification

**User Story:** As a verifier, I want to scan the QR code or enter the Veritas ID to confirm a chart's authenticity, so that I can trust the data has not been modified.

#### Acceptance Criteria

1. WHEN a user navigates to `/verify/[id]`, THE Verification Page SHALL call the Verify API to look up the record in Supabase by id
2. WHEN the record is found, THE Verify API SHALL recompute the SHA256 hash from the stored years and values arrays using the same algorithm as during record creation
3. WHEN the recomputed hash matches the stored hash, THE Verify API SHALL return `{ verified: true, record: {...} }`
4. WHEN the Verification Page receives a verified response, THE Verification Page SHALL display a ✅ "Verified" badge, a metadata table with the record details, and a recreated chart
5. WHEN the recomputed hash does not match the stored hash, THE Verify API SHALL return `{ verified: false, record: {...} }`
6. IF no record is found for the given id, THEN THE Verification Page SHALL display a ⚠️ "Cannot Verify" message with the text "No record found for this Veritas ID"
7. THE Verification Page SHALL be fully functional when accessed from a mobile device via a scanned QR code

---

### Requirement 7: Tamper Demonstration

**User Story:** As a demo presenter, I want to show a visually modified chart that fails verification, so that I can demonstrate the value of the Veritas ID system.

#### Acceptance Criteria

1. WHEN a user navigates to `/tamper/[id]`, THE Tamper Demo Page SHALL load the real chart data from Supabase by id and render the same Chart Card layout
2. THE Tamper Demo Page SHALL multiply the first data value in the values array by 1.8 before rendering the chart (visual tamper only — the Supabase record is not modified)
3. THE Tamper Demo Page SHALL display the same Veritas ID and QR code as the original record
4. THE Tamper Demo Page SHALL display a subtle "DEMO TAMPER VIEW" watermark in light grey in a corner of the card
5. THE Tamper Demo Page SHALL NOT be linked from any navigation element in the application UI
6. WHEN a user navigates to `/verify/tampered/[id]`, THE Tamper Verification Page SHALL load the record from Supabase, multiply the first value by 1.8, recompute the hash of the modified data, and compare it to the stored hash
7. WHEN the hashes do not match, THE Tamper Verification Page SHALL display a ⚠️ "Modified — Cannot Verify" message
8. THE Tamper Verification Page SHALL display a side-by-side or stacked comparison of the tampered values versus the original stored values

---

### Requirement 8: Query Page UI

**User Story:** As a user, I want a clean, minimal home page, so that I can quickly understand the product and start generating charts.

#### Acceptance Criteria

1. THE Query Page SHALL display a large centered heading "Veritas ID" and a subheading "Verify the data behind every chart"
2. THE Query Page SHALL display a single text input with placeholder text "Ask a question about World Bank data..."
3. THE Query Page SHALL display a single button labeled "Generate Chart" styled with background color `#0057B8`
4. THE Query Page SHALL display at least three example queries as clickable elements that auto-fill the text input when clicked: "Youth unemployment in Kenya over 10 years", "GDP growth in Nigeria since 2015", "Female labor participation in South Africa"
5. WHEN the "Generate Chart" button is clicked, THE Query Page SHALL display a loading state while the API request is in progress
6. WHEN the API returns a successful response, THE Query Page SHALL navigate the user to `/chart/[id]` using the returned id
7. WHEN the API returns an error response, THE Query Page SHALL display the error message inline without navigating away or crashing

---

### Requirement 9: Security and API Key Protection

**User Story:** As a developer, I want all API keys to remain server-side, so that credentials are never exposed to the browser.

#### Acceptance Criteria

1. THE application SHALL access the `ANTHROPIC_API_KEY` only within Next.js API route handlers or server components, never in client components
2. THE application SHALL access the `SUPABASE_SERVICE_ROLE_KEY` only within Next.js API route handlers or server components, never in client components
3. THE application SHALL use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side Supabase reads where appropriate
4. THE application SHALL read all required environment variables from `.env.local` and the app SHALL start successfully with `npm run dev` once `.env.local` is populated

---

### Requirement 10: Visual Design System

**User Story:** As a user, I want a professional, trustworthy visual design, so that the application feels credible when sharing chart screenshots.

#### Acceptance Criteria

1. THE application SHALL use white backgrounds, light grey borders, and black or dark grey text as the base design language
2. THE application SHALL use `#0057B8` (World Bank blue) as the accent color for buttons, links, and the verified state indicator
3. THE application SHALL use `#DC2626` (red) for tampered or modified state indicators
4. THE application SHALL use the Inter font or system font stack with generous whitespace
5. THE application SHALL use subtle card shadows and no gradient backgrounds
6. THE application SHALL be responsive and render correctly on mobile screen widths for the Verification Page

---

### Requirement 11: Database Schema and Initialization

**User Story:** As a developer, I want the Supabase schema defined in code, so that I can set up the database with a single SQL execution.

#### Acceptance Criteria

1. THE `veritas_records` table SHALL have the following columns: `id` (text, primary key), `indicator_code` (text), `indicator_label` (text), `country_code` (text), `country_name` (text), `year_start` (integer), `year_end` (integer), `years` (jsonb), `values` (jsonb), `raw_data_snapshot` (jsonb), `chart_config` (jsonb), `hash` (text), `created_at` (timestamptz, default now())
2. THE Supabase client initialization file at `/lib/supabase.ts` SHALL include the complete SQL schema as a comment at the top of the file so a developer can copy and run it in the Supabase SQL editor
3. THE application SHALL use the Supabase service role key for all server-side write operations and the anon key for client-side read operations
