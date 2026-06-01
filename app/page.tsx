"use client";

import { useState } from "react";
import { QueryForm } from "@/components/QueryForm";
import { ExampleQueries } from "@/components/ExampleQueries";
import { VerifySection } from "@/components/VerifySection";

export default function Home() {
  const [query, setQuery] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-gray-900">Veritas ID</h1>
      <p className="text-lg text-gray-500 mt-2 mb-8">
        Trust travels with the data.
      </p>
      <QueryForm value={query} onChange={setQuery} />
      <ExampleQueries onSelect={(q) => setQuery(q)} />
      <hr className="border-gray-200 w-full max-w-[800px] my-4" />
      <VerifySection />
    </main>
  );
}
