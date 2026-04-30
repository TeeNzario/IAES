"use client";

import React, { useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

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
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = useMemo(
    () =>
      value
        .map((id) => options.find((o) => o.knowledge_category_id === id))
        .filter((t): t is KnowledgeTag => Boolean(t)),
    [value, options],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter((o) => !value.includes(o.knowledge_category_id))
      .filter((o) => (q ? o.name.toLowerCase().includes(q) : true))
      .slice(0, 50);
  }, [options, value, query]);

  const add = (id: string) => {
    onChange([...value, id]);
    setQuery("");
    inputRef.current?.focus();
  };
  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  return (
    <div className="relative">
      <div
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
        className={`flex flex-wrap items-center gap-2 rounded-2xl border border-[#E0D6F5] bg-white px-4 py-3 shadow-sm transition-colors ${
          open ? "ring-2 ring-[#B7A3E3]" : "hover:border-[#B7A3E3]"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-text"}`}
      >
        {selectedTags.map((t) => (
          <span
            key={t.knowledge_category_id}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#B7A3E3] px-3 py-1 text-sm text-white"
          >
            {t.name}
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                remove(t.knowledge_category_id);
              }}
              className="ml-0.5 hover:opacity-80"
              aria-label={`ลบ ${t.name}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selectedTags.length ? "" : placeholder}
          className="min-w-40 flex-1 bg-transparent px-1 py-1 text-base font-light text-[#575757] placeholder-gray-400 outline-none"
        />
        <ChevronDown
          size={20}
          className={`shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-auto rounded-2xl bg-white py-2 shadow-lg ring-1 ring-black/5">
          {filtered.length > 0 ? (
            filtered.map((t) => (
              <button
                key={t.knowledge_category_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(t.knowledge_category_id)}
                className="block w-full cursor-pointer px-5 py-2.5 text-left text-base font-light text-[#575757] hover:bg-[#F4EFFF]"
              >
                {t.name}
              </button>
            ))
          ) : (
            <div className="px-5 py-3 text-sm text-gray-400">
              {query ? "ไม่พบหมวดหมู่" : "ไม่มีหมวดหมู่ให้เลือก"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
