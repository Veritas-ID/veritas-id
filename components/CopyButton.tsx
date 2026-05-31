"use client";

import { useState } from "react";

interface CopyButtonProps {
  url: string;
}

export function CopyButton({ url }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleClick}
      style={{ backgroundColor: "#0057B8" }}
      className="text-white rounded px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
    >
      {copied ? "Copied!" : "Copy Verification Link"}
    </button>
  );
}
