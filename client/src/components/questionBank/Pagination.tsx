"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Compact pagination matching the mock: «  1 2 3 … 99  » with active pill. */
export default function Pagination({
  page,
  totalPages,
  onChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build a small page list with ellipsis around the current page.
  const pages: (number | "...")[] = [];
  const add = (n: number | "...") => pages.push(n);
  const around = new Set<number>([1, 2, 3, page - 1, page, page + 1, totalPages]);
  let last = 0;
  Array.from(around)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b)
    .forEach((n) => {
      if (last && n - last > 1) add("...");
      add(n);
      last = n;
    });

  const goto = (n: number) => {
    if (n >= 1 && n <= totalPages && n !== page) onChange(n);
  };

  return (
    <div className="flex items-center justify-end gap-1 rounded-full bg-white px-2 py-1 shadow-sm">
      <button
        type="button"
        onClick={() => goto(page - 1)}
        disabled={page === 1}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[#575757] hover:bg-[#F4EFFF] disabled:opacity-30 cursor-pointer"
        aria-label="ก่อนหน้า"
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`e-${i}`}
            className="px-1.5 text-xs text-gray-400 select-none"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => goto(p)}
            className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs cursor-pointer ${
              p === page
                ? "bg-[#B7A3E3] text-white"
                : "text-[#575757] hover:bg-[#F4EFFF]"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => goto(page + 1)}
        disabled={page === totalPages}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[#575757] hover:bg-[#F4EFFF] disabled:opacity-30 cursor-pointer"
        aria-label="ถัดไป"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
