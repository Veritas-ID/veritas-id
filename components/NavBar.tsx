"use client";

import Link from "next/link";

export function NavBar() {
  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="max-w-[800px] mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-gray-900 tracking-tight">
          Veritas ID
        </Link>
        <a
          href="/#verify"
          className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
        >
          Verify
        </a>
      </div>
    </nav>
  );
}
