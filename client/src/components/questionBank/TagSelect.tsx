"use client";

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";

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
 * Searchable, multi-select tag picker. Read-only against existing course tags
 * (cannot create new tags). Tags not in the dropdown cannot be added.
 */
export default function TagSelect({
  options,
  value,
  onChange,
  placeholder = "ค้นหาและเลือกหมวดหมู่ความรู้",
  disabled,
}: TagSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

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
      .slice(0, 30);
  }, [options, value, query]);

  const add = (id: string) => {
    onChange([...value, id]);
    setQuery("");
  };
  const remove = (id: string) =>
    onChange(value.filter((v) => v !== id));

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-sm">
        {selectedTags.map((t) => (
          <span
            key={t.knowledge_category_id}
            className="inline-flex items-center gap-1 rounded-full bg-[#B7A3E3] px-2.5 py-0.5 text-xs text-white"
          >
            {t.name}
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(t.knowledge_category_id)}
              className="ml-0.5 hover:opacity-80"
              aria-label={`ลบ ${t.name}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={selectedTags.length ? "" : placeholder}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm font-light text-[#575757] placeholder-gray-400 outline-none"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
          {filtered.map((t) => (
            <button
              key={t.knowledge_category_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(t.knowledge_category_id)}
              className="block w-full cursor-pointer px-3 py-1.5 text-left text-sm font-light text-[#575757] hover:bg-[#F4EFFF]"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg bg-white px-3 py-2 text-xs text-gray-400 shadow-lg ring-1 ring-black/5">
          ไม่พบหมวดหมู่
        </div>
      )}
    </div>
  );
}
