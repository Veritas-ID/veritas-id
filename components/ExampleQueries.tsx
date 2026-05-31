"use client";

interface ExampleQueriesProps {
  onSelect: (query: string) => void;
}

const EXAMPLES = [
  "Youth unemployment in Kenya over 10 years",
  "GDP growth in Nigeria since 2015",
  "Female labor participation in South Africa",
];

export function ExampleQueries({ onSelect }: ExampleQueriesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span className="text-xs text-gray-400">Try an example:</span>
      {EXAMPLES.map((example) => (
        <button
          key={example}
          type="button"
          onClick={() => onSelect(example)}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          {example}
        </button>
      ))}
    </div>
  );
}
