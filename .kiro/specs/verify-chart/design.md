# Design Document — Verify a Chart

## Overview

The "Verify a Chart" feature adds a second verification flow to the existing Veritas ID Next.js 14 application. Currently users can generate World Bank data charts that receive a cryptographic Veritas ID. This feature lets any user verify the authenticity of a chart either by uploading a screenshot (scanned via Claude Vision to extract the Veritas ID) or by entering a Veritas ID directly.

Both flows query the `veritas_records` Supabase table and display a verdict page with the original chart recreated from stored data. No existing files are modified — all new functionality lives in new files.

### Key Constraints

- **No existing file modifications** — `app/page.tsx`, `app/layout.tsx`, all existing `components/*` and `lib/*` files are untouched.
- **Minimal exception**: `app/page.tsx` receives a single non-breaking addition — importing and rendering `<VerifySection />` below the existing content. This is unavoidable to satisfy Requirement 1 (Verify Section on Landing Page). The change is additive only and does not alter any existing logic.
- **Base64 image transport** — images are converted to base64 on the client and sent as JSON; no multipart form data.
- **Server-side Claude Vision** — the Anthropic API key is never exposed to the client.
- **ChartCard reuse** — all chart recreations use the existing `ChartCard` component.
- **Original timestamps** — `created_at` from Supabase is always passed through; current server time is never substituted.
- **Flow independence** — the scan flow and ID lookup flow share no state, context, or storage keys.

---

## Architecture

### High-Level Data Flow

```mermaid
flowchart TD
    subgraph Landing Page [app/page.tsx — minimal addition]
        QF[QueryForm — existing]
        HR[hr divider — new]
        VS[VerifySection — new component]
        SC[ScanCard — new]
        IC[IDCard — new]
        QF --> HR --> VS
        VS --> SC
        VS --> IC
    end

    subgraph Scan Flow
        SC -->|base64 + mediaType| SA[POST /api/scan]
        SA -->|image| CV[Claude Vision]
        CV -->|extracted VID| SA
        SA -->|VID| SB[(Supabase veritas_records)]
        SB -->|VeritasRecord| SA
        SA -->|ScanResult| SC
        SC -->|sessionStorage: scan_result| SRP[/verify/scan/result]
    end

    subgraph ID Flow
        IC -->|trimmed ID| LA[GET /api/lookup/id]
        LA -->|VID| LB[(Supabase veritas_records)]
        LB -->|VeritasRecord| LA
        LA -->|LookupResult| IC
        IC -->|sessionStorage: id_result| IRP[/verify/id/result]
    end

    subgraph NavBar
        NB[NavBar — new, added to layout.tsx]
        NB -->|href=/#verify| VS
    end
```

> **Note on layout.tsx**: The `NavBar` component is added to `app/layout.tsx` as a single import + render call above `{children}`. This is the minimal change needed to make the nav bar appear on all pages. Like the `page.tsx` change, it is purely additive.

### State Passing Between Pages

Next.js 14 App Router does not support navigation state (unlike React Router's `state` option). The two result pages need data from the preceding API call. The chosen approach is **`sessionStorage`** with dedicated, flow-specific keys:

| Flow | Write location | Key | Read location |
|------|---------------|-----|---------------|
| Scan | `ScanCard` before `router.push` | `veritas_scan_result` | `ScanResultPage` on mount |
| ID   | `IDCard` before `router.push`   | `veritas_id_result`   | `IDResultPage` on mount |

The keys are intentionally different (satisfying Requirement 9 — flow independence). Each result page reads its key on mount, clears it immediately after reading (to avoid stale data on back-navigation), and renders based on the parsed value. If the key is absent (e.g., user navigates directly to the result URL), the page renders a "no data" fallback with a link back to home.

---

## Components and Interfaces

### New Files Summary

| File | Type | Purpose |
|------|------|---------|
| `components/NavBar.tsx` | Client component | Sticky top nav with "Verify" anchor link |
| `components/VerifySection.tsx` | Client component | Landing page section containing ScanCard + IDCard |
| `app/api/scan/route.ts` | API route (server) | POST handler — Claude Vision + Supabase lookup |
| `app/api/lookup/[id]/route.ts` | API route (server) | GET handler — Supabase lookup by ID |
| `app/verify/scan/result/page.tsx` | Client page | Scan flow verdict page |
| `app/verify/id/result/page.tsx` | Client page | ID lookup verdict page |

### Minimal Additions to Existing Files

| File | Change |
|------|--------|
| `app/page.tsx` | Add `import VerifySection` + render `<hr>` + `<VerifySection />` below `<ExampleQueries />` |
| `app/layout.tsx` | Add `import NavBar` + render `<NavBar />` above `{children}` inside `<body>` |

### Component Interfaces

#### `NavBar`

```tsx
// No props — self-contained
export function NavBar(): JSX.Element
```

Renders a `<nav>` with `sticky top-0 z-10 bg-white border-b border-gray-200`. Contains a "Veritas ID" wordmark (links to `/`) and a "Verify" link (href `/#verify`).

#### `VerifySection`

```tsx
// No props — self-contained
export function VerifySection(): JSX.Element
```

Renders a `<section id="verify">` containing the heading, subheading, and a responsive grid with `ScanCard` and `IDCard`. The grid uses `grid grid-cols-1 sm:grid-cols-2 gap-6`.

#### `ScanCard` (internal to `VerifySection.tsx`)

```tsx
// Internal component, not exported separately
function ScanCard(): JSX.Element
```

Manages its own state: `file`, `loading`, `error`. On submit, converts file to base64, calls `POST /api/scan`, writes result to `sessionStorage('veritas_scan_result')`, then navigates to `/verify/scan/result`.

#### `IDCard` (internal to `VerifySection.tsx`)

```tsx
// Internal component, not exported separately
function IDCard(): JSX.Element
```

Manages its own state: `inputValue`, `loading`, `error`. On submit, calls `GET /api/lookup/[trimmedId]`, writes result to `sessionStorage('veritas_id_result')`, then navigates to `/verify/id/result`.

### API Response Types

```typescript
// POST /api/scan response
interface ScanResponse {
  success: boolean;
  id?: string;           // present when success: true
  record?: VeritasRecord; // present when success: true
  reason?: string;       // present when success: false
}

// GET /api/lookup/[id] response
interface LookupResponse {
  success: boolean;
  record?: VeritasRecord; // present when success: true
  reason?: string;        // present when success: false
}
```

### sessionStorage Payload Types

```typescript
// Key: 'veritas_scan_result'
interface ScanSessionPayload {
  apiResult: ScanResponse;
  base64Image: string;   // data URL: "data:image/png;base64,..."
}

// Key: 'veritas_id_result'
interface IDSessionPayload {
  apiResult: LookupResponse;
}
```

---

## Data Models

The feature introduces no new database tables or schema changes. All reads use the existing `veritas_records` table via `supabaseAdmin` (server-side only).

### Veritas ID Pattern

```
VID-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+
```

Examples: `VID-KEN-UNEM-8A4F2B`, `VID-USA-GDP-1A2B3C`

This regex is used in:
- `POST /api/scan` — to validate Claude Vision's extracted string
- `GET /api/lookup/[id]` — to validate the path parameter before querying Supabase

### File Validation Rules

| Rule | Value |
|------|-------|
| Accepted MIME types | `image/png`, `image/jpeg` |
| Accepted extensions | `.png`, `.jpg`, `.jpeg` |
| Maximum file size | 10 MB (10 × 1024 × 1024 bytes) |

Validation is performed client-side in `ScanCard` before any API call. The `accept` attribute on the file input is set to `image/png,image/jpeg` as a first-line filter, with explicit JS validation as the authoritative check.

### Base64 Encoding

The client uses the browser's `FileReader.readAsDataURL` API to produce a data URL (`data:image/png;base64,...`). The base64 payload sent to `POST /api/scan` strips the data URL prefix, sending only the raw base64 string alongside the `mediaType` field. The Anthropic SDK's vision API accepts this format directly.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: File validation rejects all invalid inputs

*For any* file input with a MIME type that is not `image/png` or `image/jpeg`, or with a size exceeding 10 MB, the `validateFile` function SHALL return a rejection result containing a non-empty error message, and SHALL NOT return an acceptance result.

**Validates: Requirements 2.3, 2.6**

---

### Property 2: Valid file submission always produces correct base64 payload

*For any* valid file (PNG or JPEG, ≤ 10 MB), converting it to a base64 string and constructing the API payload SHALL produce a JSON object where `base64` is a non-empty string and `mediaType` is either `"image/png"` or `"image/jpeg"` matching the file's type.

**Validates: Requirements 2.9, 5.1**

---

### Property 3: Whitespace-only ID inputs are never submitted

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), activating the "Verify" button with that string as the input value SHALL NOT trigger an API call to the Lookup_API.

**Validates: Requirements 3.4**

---

### Property 4: ID input is always trimmed before submission

*For any* non-empty string (including strings with leading or trailing whitespace), the value submitted to the Lookup_API SHALL equal the original string with all leading and trailing whitespace removed.

**Validates: Requirements 3.5**

---

### Property 5: Scan API prompt is always the specified string

*For any* valid base64 image string sent to `POST /api/scan`, the prompt passed to Claude Vision SHALL always be exactly: `"This is a data verification chart card. Extract the Veritas ID from this image. The Veritas ID always starts with VID- followed by letters, numbers, and hyphens. Return only the raw ID string, nothing else. Example: VID-KEN-UNEM-8A4F2B"`.

**Validates: Requirements 5.2**

---

### Property 6: Non-matching Claude responses always produce a specific failure

*For any* string returned by Claude Vision that does not match the pattern `VID-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+`, the Scan_API SHALL return `{ "success": false, "reason": "Could not find a Veritas ID in this image. Make sure the full chart card is visible." }`.

**Validates: Requirements 5.3**

---

### Property 7: Missing Supabase record includes extracted ID in failure reason

*For any* string matching the Veritas ID pattern that does not exist in the `veritas_records` table, the Scan_API SHALL return `{ "success": false, "reason": "No record found for Veritas ID [extracted ID]. This chart may not have been generated by Veritas ID." }` where `[extracted ID]` is the exact string extracted by Claude Vision.

**Validates: Requirements 5.5**

---

### Property 8: Scan API response never contains the Anthropic API key

*For any* input to `POST /api/scan` (valid, invalid, or error-triggering), the response body serialized as a string SHALL NOT contain the value of `process.env.ANTHROPIC_API_KEY`.

**Validates: Requirements 5.7**

---

### Property 9: Lookup API rejects all non-VID-pattern IDs with HTTP 400

*For any* path segment that does not match the pattern `VID-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+` (including empty strings, lowercase IDs, partial IDs, and random strings), `GET /api/lookup/[id]` SHALL return HTTP status 400 with `{ "success": false, "reason": "Invalid Veritas ID format." }`.

**Validates: Requirements 6.2**

---

### Property 10: Lookup API response always includes all 13 VeritasRecord fields

*For any* `veritas_records` row returned by Supabase, the Lookup_API response SHALL include all 13 fields: `id`, `indicator_code`, `indicator_label`, `country_code`, `country_name`, `year_start`, `year_end`, `years`, `values`, `raw_data_snapshot`, `chart_config`, `hash`, `created_at`.

**Validates: Requirements 6.4**

---

### Property 11: Scan result banner always includes the matched Veritas ID

*For any* successful scan result containing a Veritas ID string, the Verdict_Banner rendered by `Scan_Result_Page` SHALL contain that exact Veritas ID string within its message text.

**Validates: Requirements 7.2**

---

### Property 12: Failure banners always display the exact API reason string

*For any* failure reason string returned by either the Scan_API or Lookup_API, the Verdict_Banner rendered on the corresponding result page SHALL display that exact reason string verbatim, without truncation or modification.

**Validates: Requirements 7.3, 8.3**

---

### Property 13: Uploaded image src always matches the base64 data URL

*For any* base64 data URL string stored in `sessionStorage` by `ScanCard`, the `<img>` element rendered in the "You Uploaded" panel of `Scan_Result_Page` SHALL have its `src` attribute set to that exact data URL string.

**Validates: Requirements 7.6**

---

### Property 14: created_at is always preserved from the VeritasRecord

*For any* `VeritasRecord` with a `created_at` value, both `Scan_Result_Page` and `ID_Result_Page` SHALL pass that exact `created_at` value to `ChartCard` — the value SHALL NOT be replaced with the current time or any other timestamp.

**Validates: Requirements 7.8, 8.7**

---

### Property 15: ID result banner always includes the matched Veritas ID

*For any* successful lookup result containing a Veritas ID string, the Verdict_Banner rendered by `ID_Result_Page` SHALL contain that exact Veritas ID string within its message text.

**Validates: Requirements 8.2**

---

### Property 16: Metadata table always renders all 7 rows in correct order

*For any* `VeritasRecord`, the metadata table rendered on `ID_Result_Page` SHALL display exactly 7 rows in this order: Veritas ID, Indicator, Country, Period, Source, Generated, Hash — with the Hash value being the first 16 characters of `record.hash` followed by `"..."`.

**Validates: Requirements 8.6**

---

## Error Handling

### Client-Side Errors

| Scenario | Component | Behavior |
|----------|-----------|----------|
| No file selected on scan submit | `ScanCard` | Inline error: "Please select a file to upload." |
| Invalid file type | `ScanCard` | Inline error: "Only PNG, JPG, and JPEG files are accepted." |
| File exceeds 10 MB | `ScanCard` | Inline error: "File must be smaller than 10 MB." |
| Empty/whitespace ID input | `IDCard` | Button disabled — no submission, no error message |
| Scan API returns `success: false` | `ScanCard` | Display `reason` string inline; stay on page |
| Lookup API returns `success: false` | `IDCard` | Navigate to result page (failure verdict is shown there) |
| Network failure on scan | `ScanCard` | Inline error: "An unexpected error occurred. Please try again." |
| Network failure on lookup | `IDCard` | Inline error: "An unexpected error occurred. Please try again." |
| Result page loaded with no sessionStorage data | Result pages | Render a "No result data found" fallback with a link to `/` |

### Server-Side Errors

| Scenario | API Route | Response |
|----------|-----------|----------|
| Claude Vision API failure | `POST /api/scan` | `{ success: false, reason: "An unexpected error occurred. Please try again." }` HTTP 500 |
| Supabase query failure (scan) | `POST /api/scan` | `{ success: false, reason: "An unexpected error occurred. Please try again." }` HTTP 500 |
| Supabase query failure (lookup) | `GET /api/lookup/[id]` | `{ success: false, reason: "An unexpected error occurred. Please try again." }` HTTP 500 |
| Invalid VID format in path | `GET /api/lookup/[id]` | `{ success: false, reason: "Invalid Veritas ID format." }` HTTP 400 |

---

## Testing Strategy

### Dual Testing Approach

The feature uses both **unit/example-based tests** and **property-based tests** for comprehensive coverage.

- **Unit tests** cover specific examples, edge cases, UI rendering, and integration points.
- **Property-based tests** verify universal invariants across a wide input space.

### Property-Based Testing Library

**[fast-check](https://github.com/dubzzz/fast-check)** is the chosen PBT library for this TypeScript/Node.js project. It integrates cleanly with Jest/Vitest, supports arbitrary generators for strings, numbers, objects, and custom types, and runs a configurable number of iterations (minimum 100 per property).

Install: `npm install --save-dev fast-check`

### Property Test Configuration

Each property test MUST:
- Run a minimum of **100 iterations** (`numRuns: 100` in `fc.assert`)
- Include a comment tag referencing the design property:
  ```typescript
  // Feature: verify-chart, Property N: <property_text>
  ```
- Use mocks for external dependencies (Supabase, Anthropic SDK) to keep tests fast and deterministic

### Property Tests (one test per property)

| Property | Test file | Generators |
|----------|-----------|-----------|
| P1: File validation rejects invalid inputs | `__tests__/validateFile.test.ts` | `fc.record({ type: fc.string(), size: fc.integer() })` |
| P2: Valid file produces correct base64 payload | `__tests__/validateFile.test.ts` | `fc.uint8Array()` for file content |
| P3: Whitespace IDs never submitted | `__tests__/IDCard.test.tsx` | `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` |
| P4: ID input is always trimmed | `__tests__/IDCard.test.tsx` | `fc.string()` with padding |
| P5: Scan API prompt is always correct | `__tests__/api.scan.test.ts` | `fc.base64String()` |
| P6: Non-matching Claude responses → failure | `__tests__/api.scan.test.ts` | `fc.string()` filtered to not match VID pattern |
| P7: Missing record includes extracted ID | `__tests__/api.scan.test.ts` | `fc.string()` matching VID pattern |
| P8: Scan API never leaks API key | `__tests__/api.scan.test.ts` | `fc.oneof(fc.base64String(), fc.string())` |
| P9: Lookup API rejects non-VID paths | `__tests__/api.lookup.test.ts` | `fc.string()` filtered to not match VID pattern |
| P10: Lookup API response has all 13 fields | `__tests__/api.lookup.test.ts` | `fc.record(veritasRecordArb)` |
| P11: Scan banner includes matched VID | `__tests__/ScanResultPage.test.tsx` | `fc.string()` matching VID pattern |
| P12: Failure banners display exact reason | `__tests__/ResultPages.test.tsx` | `fc.string()` |
| P13: Uploaded image src matches data URL | `__tests__/ScanResultPage.test.tsx` | `fc.base64String()` |
| P14: created_at always preserved | `__tests__/ResultPages.test.tsx` | `fc.record(veritasRecordArb)` |
| P15: ID result banner includes matched VID | `__tests__/IDResultPage.test.tsx` | `fc.string()` matching VID pattern |
| P16: Metadata table has 7 rows in order | `__tests__/IDResultPage.test.tsx` | `fc.record(veritasRecordArb)` |

### Unit Tests

Unit tests cover:
- `NavBar` renders "Verify" link with correct href and classes
- `VerifySection` renders with `id="verify"`, correct heading/subheading, and responsive grid classes
- `ScanCard` initial state (no error shown), button label, no text input for ID
- `IDCard` initial state, input placeholder, button label, disabled state during loading
- `POST /api/scan` — valid request accepted, Claude called, Supabase queried, success response shape
- `GET /api/lookup/[id]` — valid ID accepted, Supabase queried, success response shape, not-found response
- `ScanResultPage` — no sessionStorage data renders fallback; success renders two-column layout; failure renders help section
- `IDResultPage` — no sessionStorage data renders fallback; success renders ChartCard + metadata table; failure renders help section

### Integration Points

The following are verified with example-based integration tests (not PBT):
- `POST /api/scan` end-to-end with a real test image (mocked Claude + mocked Supabase)
- `GET /api/lookup/[id]` end-to-end with a real VID (mocked Supabase)
- sessionStorage round-trip: write in card component, read in result page
