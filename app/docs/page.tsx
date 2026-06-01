"use client";

import Link from "next/link";
import { useState } from "react";

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <pre className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-sm font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {children.trim()}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 text-xs text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function SectionDivider() {
  return <hr className="border-gray-100 my-12" />;
}

export default function DocsPage() {
  return (
    <main className="max-w-[800px] mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6 inline-block"
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Veritas ID</h1>
        <p className="text-gray-500 text-base">Documentation</p>
      </div>

      {/* Section nav */}
      <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 mb-12 pb-6 border-b border-gray-100">
        <a href="#installation" className="hover:text-gray-900 transition-colors">Installation</a>
        <a href="#architecture" className="hover:text-gray-900 transition-colors">Architecture</a>
        <a href="#api-integration" className="hover:text-gray-900 transition-colors">API Integration</a>
        <a href="#security" className="hover:text-gray-900 transition-colors">Security</a>
      </nav>

      {/* Section 1 — Installation */}
      <section id="installation">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Installation</h2>

        <p className="text-sm text-gray-500 mb-4 font-medium uppercase tracking-wide">Prerequisites</p>
        <ul className="text-gray-700 text-sm space-y-1 mb-8 list-disc list-inside">
          <li>Node.js 18 or higher</li>
          <li>A Supabase account (free tier)</li>
          <li>An Anthropic API key</li>
        </ul>

        <h3 className="text-base font-semibold text-gray-800 mb-2">Step 1 — Clone the Repository</h3>
        <CodeBlock>{`git clone https://github.com/[your-repo]/veritas-id
cd veritas-id`}</CodeBlock>

        <h3 className="text-base font-semibold text-gray-800 mb-2 mt-6">Step 2 — Install Dependencies</h3>
        <CodeBlock>{`npm install`}</CodeBlock>

        <h3 className="text-base font-semibold text-gray-800 mb-2 mt-6">Step 3 — Configure Environment Variables</h3>
        <p className="text-gray-600 text-sm mb-3">Create a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code> file in the root directory and add the following:</p>
        <CodeBlock>{`NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000`}</CodeBlock>

        <h3 className="text-base font-semibold text-gray-800 mb-2 mt-6">Step 4 — Set Up the Database</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          Open your Supabase project. Navigate to the SQL Editor. Run the schema found in{" "}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">/lib/supabase.ts</code>{" "}
          at the top of the file as a comment.
        </p>

        <h3 className="text-base font-semibold text-gray-800 mb-2 mt-6">Step 5 — Run the Application</h3>
        <CodeBlock>{`npm run dev`}</CodeBlock>
        <p className="text-gray-600 text-sm mt-2">
          Open{" "}
          <a href="http://localhost:3000" className="text-gray-900 underline underline-offset-2">
            http://localhost:3000
          </a>
        </p>

        <h3 className="text-base font-semibold text-gray-800 mb-2 mt-6">Step 6 — Deploy to Vercel (Optional)</h3>
        <ol className="text-gray-600 text-sm space-y-1 list-decimal list-inside">
          <li>Push your repository to GitHub.</li>
          <li>Connect the repository to Vercel.</li>
          <li>Add all environment variables in Vercel project settings.</li>
          <li>Deploy.</li>
        </ol>
      </section>

      <SectionDivider />

      {/* Section 2 — Architecture */}
      <section id="architecture">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Architecture Overview</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          Veritas ID is a single Next.js 14 application using the App Router. All frontend, backend logic, and API routes live within one codebase deployed on Vercel.
        </p>

        <p className="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">Stack</p>
        <ul className="text-gray-700 text-sm space-y-1 mb-8 list-disc list-inside">
          <li>Frontend: Next.js 14, React, Tailwind CSS</li>
          <li>Charts: Recharts</li>
          <li>AI: Claude API (claude-sonnet-4-20250514)</li>
          <li>Data: World Bank Open API v2</li>
          <li>Database: Supabase (PostgreSQL)</li>
          <li>Deployment: Vercel</li>
        </ul>

        <p className="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">Generation Flow</p>
        <ol className="text-gray-700 text-sm space-y-2 list-decimal list-inside mb-8">
          <li>User submits a natural language query</li>
          <li>Claude API extracts indicator, country, and year range from the query</li>
          <li>World Bank Open API returns verified data</li>
          <li>SHA256 hash is computed from data values</li>
          <li>Unique Veritas ID is generated: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">VID-[COUNTRY]-[INDICATOR]-[HASH PREFIX]</code></li>
          <li>Record stored in Supabase with full data snapshot, hash, and metadata</li>
          <li>QR code generated pointing to verification portal</li>
          <li>Chart rendered as screenshot-ready artifact</li>
        </ol>

        <p className="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">Verification Flow — Image Upload</p>
        <ol className="text-gray-700 text-sm space-y-2 list-decimal list-inside mb-8">
          <li>User uploads a chart screenshot</li>
          <li>Single Claude Vision API call extracts Veritas ID and data values simultaneously</li>
          <li>Supabase queried using extracted ID</li>
          <li>Extracted values compared against stored values with ±1.0 tolerance</li>
          <li>Result: Authentic or Tampered</li>
        </ol>

        <p className="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">Verification Flow — ID Lookup</p>
        <ol className="text-gray-700 text-sm space-y-2 list-decimal list-inside">
          <li>User enters Veritas ID manually</li>
          <li>Supabase queried</li>
          <li>Original chart retrieved and displayed</li>
        </ol>
      </section>

      <SectionDivider />

      {/* Section 3 — API Integration */}
      <section id="api-integration">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Data360 API Integration Methodology</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          Veritas ID uses the World Bank Open API v2 as its verified data source. No authentication required.
        </p>

        <p className="text-sm text-gray-500 mb-2 font-medium uppercase tracking-wide">Base URL</p>
        <CodeBlock>{`https://api.worldbank.org/v2`}</CodeBlock>

        <p className="text-sm text-gray-500 mb-2 mt-6 font-medium uppercase tracking-wide">Query Format</p>
        <CodeBlock>{`https://api.worldbank.org/v2/country/{countryCode}/indicator/{indicatorCode}?date={startYear}:{endYear}&format=json&per_page=100`}</CodeBlock>

        <p className="text-sm text-gray-500 mb-3 mt-6 font-medium uppercase tracking-wide">Supported Indicators</p>
        <ul className="text-gray-700 text-sm space-y-1 mb-8 list-disc list-inside font-mono">
          <li><span className="font-sans text-gray-600">Youth Unemployment —</span> SL.UEM.1524.ZS</li>
          <li><span className="font-sans text-gray-600">GDP Growth —</span> NY.GDP.MKTP.KD.ZG</li>
          <li><span className="font-sans text-gray-600">Adult Literacy Rate —</span> SE.ADT.LITR.ZS</li>
          <li><span className="font-sans text-gray-600">Inflation Rate —</span> FP.CPI.TOTL.ZG</li>
          <li><span className="font-sans text-gray-600">Female Labor Force Participation —</span> SL.TLF.ACTI.FE.ZS</li>
          <li><span className="font-sans text-gray-600">CO2 Emissions per Capita —</span> EN.ATM.CO2E.PC</li>
          <li><span className="font-sans text-gray-600">Population Growth —</span> SP.POP.GROW</li>
        </ul>

        <p className="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">Natural Language Mapping</p>
        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          Claude API interprets user queries using a hybrid approach. Claude extracts intent from natural language. A deterministic mapping layer resolves the exact World Bank indicator code. Claude never directly handles API codes, preventing hallucination and ensuring consistent data retrieval.
        </p>

        <p className="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">Data Processing</p>
        <ul className="text-gray-700 text-sm space-y-1 list-disc list-inside">
          <li>API response parsed and cleaned</li>
          <li>Null values filtered out</li>
          <li>Data sorted chronologically</li>
          <li>Full snapshot stored in Supabase at time of generation</li>
        </ul>
      </section>

      <SectionDivider />

      {/* Section 4 — Security */}
      <section id="security">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Security and Data Handling Protocols</h2>

        <p className="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">API Key Security</p>
        <ul className="text-gray-700 text-sm space-y-1 mb-8 list-disc list-inside">
          <li>All API keys stored as server-side environment variables only</li>
          <li>Never exposed to the client</li>
          <li>All Claude API and Supabase service role calls made server-side only</li>
        </ul>

        <p className="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">Data Integrity</p>
        <ul className="text-gray-700 text-sm space-y-1 mb-8 list-disc list-inside">
          <li>Every chart generates a SHA256 hash computed from the data values at time of generation</li>
          <li>Hash stored in Supabase and cannot be modified after storage</li>
          <li>Verification recomputes hash from stored values and compares</li>
        </ul>

        <p className="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">Tamper Detection</p>
        <ul className="text-gray-700 text-sm space-y-1 mb-8 list-disc list-inside">
          <li>Claude Vision extracts data values from uploaded chart images</li>
          <li>Values compared against stored record with ±1.0 tolerance for visual estimation</li>
          <li>Discrepancies flagged and displayed year by year</li>
        </ul>

        <p className="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">Data Privacy</p>
        <ul className="text-gray-700 text-sm space-y-1 list-disc list-inside">
          <li>No user accounts or personal data collected</li>
          <li>No cookies or tracking</li>
          <li>Verification is public and anonymous</li>
          <li>Chart records are append-only</li>
        </ul>
      </section>

      <div className="mt-16 pt-8 border-t border-gray-100 text-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
