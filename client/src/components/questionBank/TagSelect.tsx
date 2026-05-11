"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface KnowledgeTag {
  knowledge_category_id: string;
  name: string;
}

interface TagSelectProps {
  /** All tags available for the current course. */
  options: KnowledgeTag[];
  /** Currently selected tag ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Searchable, multi-select dropdown for knowledge categories.
 * Read-only against existing course tags (cannot create new tags).
 */
export default function TagSelect({
  options,
  value,
  onChange,
  placeholder = "เลือกหมวดหมู่ความรู้",
  disabled,
}: TagSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedTags = useMemo(
    () =>
      value
        .map((id) => options.find((o) => o.knowledge_category_id === id))
        .filter((t): t is KnowledgeTag => Boolean(t)),
    [value, options],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) =>
      q ? o.name.toLowerCase().includes(q) : true,
    );
  }, [options, query]);

  const selectedLabel =
    selectedTags.length === 0
      ? placeholder
      : selectedTags.length === 1
        ? selectedTags[0].name
        : `${selectedTags.length} หมวดหมู่ที่เลือก`;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    onChange([...value, id]);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (open) setQuery("");
          setOpen((next) => !next);
        }}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left text-sm font-semibold text-[#2F2A3A] shadow-sm ring-1 ring-[#E7DDF8] transition focus:outline-none focus:ring-2 focus:ring-[#B7A3E3] ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:bg-[#FAF8FF]"
        }`}
        aria-expanded={open}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedTags.length === 0 ? "text-[#B7AFC6]" : ""
          }`}
        >
          {selectedLabel}
        </span>
        {selectedTags.length > 0 && (
          <span className="shrink-0 rounded-full bg-[#B7A3E3] px-2 py-0.5 text-xs font-semibold text-white">
            {selectedTags.length}
          </span>
        )}
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#7C5BD9] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-[#D9CCF2]">
          <div className="border-b border-[#EFE8FB] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2F2A3A]">
                  หมวดหมู่ความรู้
                </p>
                <p className="mt-0.5 text-xs font-medium text-[#7A7287]">
                  {selectedTags.length === 0
                    ? "ยังไม่ได้เลือกหมวดหมู่"
                    : `เลือกอยู่ ${selectedTags.length} หมวดหมู่`}
                </p>
              </div>
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                >
                  ล้าง
                </button>
              )}
            </div>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8F84A3]"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาหมวดหมู่ความรู้"
                className="h-9 w-full rounded-lg bg-[#FAF8FF] pl-9 pr-3 text-sm font-medium text-[#2F2A3A] placeholder:text-[#B7AFC6] outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length > 0 ? (
              filtered.map((tag) => {
                const active = value.includes(tag.knowledge_category_id);
                return (
                  <button
                    key={tag.knowledge_category_id}
                    type="button"
                    onClick={() => toggle(tag.knowledge_category_id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-[#F4EFFF] text-[#7C5BD9]"
                        : "text-[#2F2A3A] hover:bg-[#FAF8FF]"
                    }`}
                    title={tag.name}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        active
                          ? "border-[#7C5BD9] bg-[#7C5BD9]"
                          : "border-[#D9CCF2] bg-white"
                      }`}
                    >
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {tag.name}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-3 text-sm font-medium text-[#7A7287]">
                {options.length === 0
                  ? "ไม่มีหมวดหมู่ความรู้ให้เลือก"
                  : "ไม่พบหมวดหมู่ความรู้"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
