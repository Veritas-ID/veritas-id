# Requirements Document

## Introduction

The "Verify a Chart" feature adds a second verification flow to the existing Veritas ID Next.js 14 application. Currently, users can generate World Bank data charts that receive a cryptographic Veritas ID. This feature allows any user to verify the authenticity of a chart either by uploading a screenshot (which is scanned via Claude Vision to extract the Veritas ID) or by entering a Veritas ID directly. Both flows query the `veritas_records` Supabase table and display a verdict page with the original chart recreated from stored data. No existing files are modified.

## Glossary

- **Veritas_ID**: A unique identifier assigned to a generated chart, always beginning with `VID-` followed by letters, numbers, and hyphens (e.g., `VID-KEN-UNEM-8A4F2B`).
- **Landing_Page**: The existing Next.js page served at the `/` route.
- **Verify_Section**: The new second section added below the existing query input on the Landing_Page, containing the two verification cards. It has the HTML `id` attribute `verify` for anchor navigation.
- **Scan_Card**: The upload-image verification card (Card A) rendered inside the Verify_Section.
- **ID_Card**: The enter-Veritas-ID verification card (Card B) rendered inside the Verify_Section.
- **Scan_API**: The new server-side API route at `POST /api/scan`.
- **Lookup_API**: The new server-side API route at `GET /api/lookup/[id]`.
- **Scan_Result_Page**: The new Next.js page at `/verify/scan/result`.
- **ID_Result_Page**: The new Next.js page at `/verify/id/result`.
- **Claude_Vision**: The Anthropic Claude `claude-sonnet-4-5` model used server-side to extract a Veritas_ID from an uploaded image.
- **Supabase**: The backend database service hosting the `veritas_records` table.
- **ChartCard**: The existing React component at `components/ChartCard.tsx` used to recreate charts from stored data.
- **VeritasRecord**: The TypeScript interface defined in `lib/supabase.ts` representing a full row from `veritas_records` with fields: `id`, `indicator_code`, `indicator_label`, `country_code`, `country_name`, `year_start`, `year_end`, `years`, `values`, `raw_data_snapshot`, `chart_config`, `hash`, `created_at`.
- **Verdict_Banner**: A full-width banner at the top of a result page indicating success (green) or failure (red).
- **Nav_Bar**: The top navigation bar rendered in the application layout.

---

## Requirements

### Requirement 1: Verify Section on Landing Page

**User Story:** As a user, I want to see a "Verify a Chart" section on the landing page, so that I can easily discover and access both verification flows without navigating away.

#### Acceptance Criteria

1. THE Landing_Page SHALL render the Verify_Section below the existing query input, separated by a horizontal `<hr>` element styled with `border-gray-200`.
2. THE Verify_Section SHALL have the HTML `id` attribute set to `verify` to enable anchor navigation.
3. THE Verify_Section SHALL display a heading with the text "Verify a Chart".
4. THE Verify_Section SHALL display a subheading with the text "Check if a chart is authentic and unmodified".
5. THE Verify_Section SHALL render the Scan_Card and the ID_Card side by side at equal width (`w-full` within a `grid-cols-2` grid) when the viewport width is at or above 640px (Tailwind `sm` breakpoint).
6. WHEN the viewport width is below 640px, THE Verify_Section SHALL render the Scan_Card and the ID_Card stacked vertically in a single column (`grid-cols-1`).

---

### Requirement 2: Scan Card (Upload Image)

**User Story:** As a user, I want to upload a chart screenshot, so that the system can automatically extract the Veritas ID and verify the chart without me needing to know the ID.

#### Acceptance Criteria

1. THE Scan_Card SHALL display an upload icon, a title reading "Upload Chart Image", and subtext reading "Upload a screenshot — we'll find and verify it automatically".
2. THE Scan_Card SHALL render a file upload area that accepts drag-and-drop and click-to-upload interactions.
3. THE Scan_Card SHALL restrict accepted file types to PNG, JPG, and JPEG only, and SHALL reject files exceeding 10 MB in size.
4. THE Scan_Card SHALL display a button labelled "Scan & Verify".
5. THE Scan_Card SHALL NOT render a text input field for manual Veritas ID entry.
6. WHEN a user selects a file whose type is not PNG, JPG, or JPEG, or whose size exceeds 10 MB, THE Scan_Card SHALL display an inline error message indicating the rejection reason and SHALL NOT submit the file.
7. IF no file selection has occurred, THEN THE Scan_Card SHALL NOT display a file-type or file-size error message.
8. WHEN the "Scan & Verify" button is activated with no file selected, THE Scan_Card SHALL NOT submit a request and SHALL display an inline error message indicating that a file must be selected.
9. WHEN the "Scan & Verify" button is activated with a valid file selected (PNG, JPG, or JPEG, no larger than 10 MB), THE Scan_Card SHALL display a loading indicator and SHALL convert the file to a base64 string and submit it to the Scan_API.
10. WHEN the Scan_API returns a successful response containing a resolved Veritas ID, THE Scan_Card SHALL navigate the user to the Scan_Result_Page, passing the API result and the base64 image string via navigation state.
11. IF the Scan_API returns a failure response, THEN THE Scan_Card SHALL display the reason message inline and SHALL remain on the current page without navigating away.

---

### Requirement 3: ID Card (Enter Veritas ID)

**User Story:** As a user, I want to enter a Veritas ID directly, so that I can verify a chart when I already know its identifier.

#### Acceptance Criteria

1. THE ID_Card SHALL display a search or fingerprint icon, a title reading "Verify by ID", and subtext reading "Enter the Veritas ID shown on any chart".
2. THE ID_Card SHALL render a single text input with placeholder text "VID-KEN-UNEM-8A4F2B".
3. THE ID_Card SHALL display a button labelled "Verify".
4. WHEN the "Verify" button is activated with an input that is empty or contains only whitespace, THE ID_Card SHALL NOT submit a request.
5. WHEN the "Verify" button is activated with a non-empty, non-whitespace input, THE ID_Card SHALL display a loading indicator and SHALL submit the trimmed input value to the Lookup_API.
6. WHEN the Lookup_API returns a response, THE ID_Card SHALL navigate the user to the ID_Result_Page, passing the full API response via navigation state.
7. WHEN the Lookup_API call is in progress, THE ID_Card SHALL disable the "Verify" button and the text input to prevent duplicate submissions.
8. IF the Lookup_API returns an unexpected error (network failure or HTTP 500), THEN THE ID_Card SHALL display an inline error message and SHALL remain on the current page.

---

### Requirement 4: Navigation Link

**User Story:** As a user, I want a "Verify" link in the top navigation bar, so that I can jump directly to the verification section from anywhere on the landing page.

#### Acceptance Criteria

1. THE Nav_Bar SHALL render a link labelled "Verify" that is visible on all pages.
2. WHEN the "Verify" link is activated, THE Nav_Bar SHALL navigate to `/#verify`, triggering smooth scroll to the element with `id="verify"` on the Landing_Page.
3. THE Nav_Bar SHALL use white background, `border-b border-gray-200` bottom border, and `text-gray-700` link text to match the existing application design.
4. THE Nav_Bar SHALL be rendered as a sticky header (`sticky top-0 z-10`) so the "Verify" link is reachable from any scroll position on the Landing_Page.

---

### Requirement 5: Scan API (POST /api/scan)

**User Story:** As the system, I want a server-side API route that accepts an image and returns a verification result, so that the Anthropic API key is never exposed to the client.

#### Acceptance Criteria

1. THE Scan_API SHALL accept a POST request with a JSON body containing a `base64` string field representing the uploaded image and a `mediaType` string field indicating the image MIME type (`image/png`, `image/jpeg`).
2. WHEN a valid base64 image is received, THE Scan_API SHALL send the image to Claude_Vision with the prompt: "This is a data verification chart card. Extract the Veritas ID from this image. The Veritas ID always starts with VID- followed by letters, numbers, and hyphens. Return only the raw ID string, nothing else. Example: VID-KEN-UNEM-8A4F2B".
3. WHEN Claude_Vision returns a response that does not contain a string matching the pattern `VID-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+`, THE Scan_API SHALL return `{ "success": false, "reason": "Could not find a Veritas ID in this image. Make sure the full chart card is visible." }` with HTTP status 200.
4. WHEN Claude_Vision returns a string matching the Veritas_ID pattern, THE Scan_API SHALL query the `veritas_records` Supabase table for a record with `id` equal to the extracted string.
5. IF no matching record exists in Supabase after a Veritas_ID has been successfully extracted, THEN THE Scan_API SHALL return `{ "success": false, "reason": "No record found for Veritas ID [extracted ID]. This chart may not have been generated by Veritas ID." }` with HTTP status 200, substituting the actual extracted ID for `[extracted ID]`.
6. WHEN a matching record is found in Supabase, THE Scan_API SHALL return `{ "success": true, "id": "[id]", "record": [full VeritasRecord with all 13 fields] }` with HTTP status 200.
7. THE Scan_API SHALL access `ANTHROPIC_API_KEY` only within the server-side route handler and SHALL NOT include it in any response body or header.
8. IF an unexpected server error occurs, THEN THE Scan_API SHALL return `{ "success": false, "reason": "An unexpected error occurred. Please try again." }` with HTTP status 500.

---

### Requirement 6: Lookup API (GET /api/lookup/[id])

**User Story:** As the system, I want a server-side API route that looks up a Veritas ID in Supabase, so that the ID verification flow can retrieve the original record.

#### Acceptance Criteria

1. THE Lookup_API SHALL accept a GET request where the `[id]` path segment is the Veritas_ID to look up.
2. IF the `[id]` path segment is empty, missing, or does not match the pattern `VID-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+`, THEN THE Lookup_API SHALL return `{ "success": false, "reason": "Invalid Veritas ID format." }` with HTTP status 400.
3. WHEN the requested identifier does not exist in Supabase, THE Lookup_API SHALL return `{ "success": false, "reason": "No record found for this Veritas ID." }` with HTTP status 200.
4. WHEN the requested identifier exists in Supabase, THE Lookup_API SHALL return `{ "success": true, "record": [full VeritasRecord with all 13 fields: id, indicator_code, indicator_label, country_code, country_name, year_start, year_end, years, values, raw_data_snapshot, chart_config, hash, created_at] }` with HTTP status 200.
5. IF an unexpected server error occurs, THEN THE Lookup_API SHALL return `{ "success": false, "reason": "An unexpected error occurred. Please try again." }` with HTTP status 500.

---

### Requirement 7: Scan Result Page (/verify/scan/result)

**User Story:** As a user, I want to see a clear verdict after uploading a chart image, so that I can immediately understand whether the chart is authentic and compare it to the original.

#### Acceptance Criteria

1. THE Scan_Result_Page SHALL render a full-width Verdict_Banner spanning 100% of the viewport width at the top of the page.
2. WHEN the scan result is a success, THE Scan_Result_Page SHALL render the Verdict_Banner with background color `#16A34A`, a ✅ icon, the heading "Chart Found & Verified", and the message "Veritas ID [id] matched a record in the database. Original chart has been recreated below.", substituting the matched Veritas_ID for `[id]`.
3. WHEN the scan result is a failure, THE Scan_Result_Page SHALL render the Verdict_Banner with background color `#DC2626`, a ⚠️ icon, and the exact reason string returned by the Scan_API.
4. WHEN the scan result is a failure, THE Scan_Result_Page SHALL render a help section below the Verdict_Banner containing a link back to the home page (`/`).
5. WHEN the scan result is a success, THE Scan_Result_Page SHALL render a two-column grid layout below the Verdict_Banner containing a "You Uploaded" panel (left) and an "Original on Record" panel (right).
6. THE "You Uploaded" panel SHALL render the uploaded image using an `<img>` element whose `src` is the base64 data URL passed from the Scan_Card, and a label reading "Your uploaded screenshot" in `text-sm text-gray-500`.
7. THE "Original on Record" panel SHALL render the existing ChartCard component populated with the VeritasRecord returned by the Scan_API, using the record's `years`, `values`, `indicator_label`, `country_name`, `year_start`, `year_end`, `id`, and `created_at` fields.
8. THE Scan_Result_Page SHALL pass the `created_at` value from the VeritasRecord to ChartCard and SHALL NOT substitute the current server time.
9. WHEN the viewport width is below 640px (Tailwind `sm` breakpoint), THE Scan_Result_Page SHALL render the two panels stacked vertically in a single column.

---

### Requirement 8: ID Result Page (/verify/id/result)

**User Story:** As a user, I want to see a clear verdict after entering a Veritas ID, so that I can confirm the chart is authentic and inspect its full metadata.

#### Acceptance Criteria

1. THE ID_Result_Page SHALL render a full-width Verdict_Banner spanning 100% of the viewport width at the top of the page.
2. WHEN the lookup result is a success (record found), THE ID_Result_Page SHALL render the Verdict_Banner with background color `#16A34A`, a ✅ icon, the heading "Verified", and the message "Veritas ID [id] is authentic and on record.", substituting the matched Veritas_ID for `[id]`.
3. WHEN the lookup result is a failure (no record found), THE ID_Result_Page SHALL render the Verdict_Banner with background color `#DC2626`, a ⚠️ icon, and the exact reason string returned by the Lookup_API.
4. IF the lookup result is a failure, THEN THE ID_Result_Page SHALL render a help section below the Verdict_Banner containing a link back to the home page (`/`).
5. WHEN the lookup result is a success, THE ID_Result_Page SHALL render a single centered column below the Verdict_Banner containing the existing ChartCard component and a full metadata table.
6. THE metadata table SHALL display the following rows in order: Veritas ID (monospace), Indicator, Country, Period (`year_start – year_end`), Source ("World Bank Data360"), Generated (original `created_at` formatted as "MMM D, YYYY, H:MM AM/PM"), and Hash (first 16 characters of `hash` followed by "...").
7. THE ID_Result_Page SHALL pass the `created_at` value from the VeritasRecord to ChartCard and SHALL NOT substitute the current server time.

---

### Requirement 9: Flow Independence

**User Story:** As a developer, I want the scan flow and the ID lookup flow to be completely independent, so that state from one flow never contaminates the other.

#### Acceptance Criteria

1. THE Scan_Card, Scan_API, and Scan_Result_Page SHALL NOT import, read, or write any module-level variable, React context, or browser storage key that is also used by the ID_Card, Lookup_API, or ID_Result_Page.
2. THE ID_Card, Lookup_API, and ID_Result_Page SHALL NOT import, read, or write any module-level variable, React context, or browser storage key that is also used by the Scan_Card, Scan_API, or Scan_Result_Page.

---

### Requirement 10: Styling Consistency

**User Story:** As a user, I want the new verify feature to look consistent with the rest of the application, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Verify_Section SHALL use white backgrounds (`bg-white`), `border border-gray-200` card borders, `shadow-sm` card shadows, and `text-gray-900` / `text-gray-500` text to match the existing application design language.
2. THE Verdict_Banner SHALL use background color `#16A34A` and white text for success states.
3. THE Verdict_Banner SHALL use background color `#DC2626` and white text for failure states.
4. WHEN displaying accent UI elements (buttons, links, icons) outside the Verdict_Banner on result pages, THE Scan_Result_Page and ID_Result_Page SHALL use `#0057B8` as the primary accent color.
5. THE Scan_Card and ID_Card SHALL each use identical Tailwind classes for padding (`p-6`), border (`border border-gray-200`), shadow (`shadow-sm`), border radius (`rounded-lg`), and background (`bg-white`), ensuring equal visual weight.
