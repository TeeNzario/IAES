"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Eye, Filter, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import Pagination from "@/components/questionBank/Pagination";
import {
  difficultyLabel,
  Question,
} from "@/components/questionBank/types";

interface YearOption {
  question_bank_year_id: string;
  academic_year: number;
}
interface CollectionOption {
  question_collection_id: string;
  title: string;
}
interface ListResponse {
  data: Question[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const PAGE_SIZE = 8;

interface Props {
  offeringId: string;
  /** Full Question objects already chosen on the parent page (pre-checked). */
  initialSelected: Question[];
  onCancel: () => void;
  /** Called with the final selected list (Question objects). */
  onConfirm: (selected: Question[]) => void;
}

/**
 * Modal: "เลือกคำถาม". Course-wide searchable question list with filter
 * (academic year + collection), multi-select, per-row eye-expand preview,
 * and pagination. Matches the UI mocks.
 */
export default function ExamQuestionPickerModal({
  offeringId,
  initialSelected,
  onCancel,
  onConfirm,
}: Props) {
  // Filter state.
  const [filterOpen, setFilterOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [collectionFilter, setCollectionFilter] = useState<string | "all">(
    "all",
  );

  // Filter option lists.
  const [years, setYears] = useState<YearOption[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);

  // Data.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  /**
   * Master selection map keyed by question_id. Survives pagination/filtering.
   * Seeded with the FULL Question objects passed by the parent so we never
   * return skeleton rows on confirm.
   */
  const [selected, setSelected] = useState<Map<string, Question>>(() => {
    const m = new Map<string, Question>();
    initialSelected.forEach((q) => m.set(q.question_id, q));
    return m;
  });

  // Load years (filter dropdown 1).
  useEffect(() => {
    apiFetch<YearOption[]>(
      `/course-offerings/${offeringId}/question-bank/years`,
    )
      .then(setYears)
      .catch(() => setYears([]));
  }, [offeringId]);

  // Load collections whenever year filter changes.
  useEffect(() => {
    if (yearFilter === "all") {
      setCollections([]);
      setCollectionFilter("all");
      return;
    }
    apiFetch<CollectionOption[]>(
      `/course-offerings/${offeringId}/question-bank/years/${yearFilter}/collections`,
    )
      .then(setCollections)
      .catch(() => setCollections([]));
    setCollectionFilter("all");
  }, [offeringId, yearFilter]);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, yearFilter, collectionFilter]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (yearFilter !== "all") params.set("year", String(yearFilter));
      if (collectionFilter !== "all")
        params.set("collection_id", collectionFilter);
      const data = await apiFetch<ListResponse>(
        `/course-offerings/${offeringId}/question-bank/questions?${params}`,
      );
      setQuestions(data.data);
      setTotalPages(Math.max(1, data.pagination.totalPages));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "โหลดคำถามไม่สำเร็จ";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [offeringId, page, debouncedSearch, yearFilter, collectionFilter]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const toggle = (q: Question) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(q.question_id)) next.delete(q.question_id);
      else next.set(q.question_id, q);
      return next;
    });
  };

  const selectedCount = selected.size;

  const handleConfirm = () => {
    onConfirm(Array.from(selected.values()));
  };

  const clearFilters = () => {
    setYearFilter("all");
    setCollectionFilter("all");
  };

  const filterActive = yearFilter !== "all" || collectionFilter !== "all";
  const activeChipLabel = useMemo(() => {
    if (!filterActive) return "ทั้งหมด";
    const parts: string[] = [];
    if (yearFilter !== "all") parts.push(`${yearFilter}`);
    if (collectionFilter !== "all") {
      const c = collections.find(
        (x) => x.question_collection_id === collectionFilter,
      );
      if (c) parts.push(c.title);
    }
    return parts.join(" · ");
  }, [filterActive, yearFilter, collectionFilter, collections]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-7 shadow-xl">
        <h2 className="mb-5 text-center text-lg font-medium text-[#575757]">
          เลือกคำถาม
        </h2>

        {/* Active-filter chip + filter toggle */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs ${
              filterActive
                ? "border-[#B7A3E3] bg-[#F4EFFF] text-[#B7A3E3]"
                : "border-[#B7A3E3] text-[#B7A3E3]"
            }`}
          >
            {activeChipLabel}
            {filterActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-2 cursor-pointer"
                aria-label="ล้างตัวกรอง"
              >
                ×
              </button>
            )}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B7A3E3] text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
              aria-label="กรอง"
            >
              <Filter size={14} />
            </button>

            {filterOpen && (
              <div className="absolute left-0 top-full z-10 mt-2 flex w-[320px] gap-0 rounded-lg border border-gray-200 bg-white p-0 shadow-lg">
                <FilterColumn
                  title="ปีการศึกษา"
                  options={[
                    { value: "all", label: "ทั้งหมด" },
                    ...years.map((y) => ({
                      value: String(y.academic_year),
                      label: String(y.academic_year),
                    })),
                  ]}
                  value={yearFilter === "all" ? "all" : String(yearFilter)}
                  onSelect={(v) =>
                    setYearFilter(v === "all" ? "all" : Number(v))
                  }
                />
                <FilterColumn
                  title="ชุดที่"
                  disabled={yearFilter === "all"}
                  options={[
                    { value: "all", label: "ทั้งหมด" },
                    ...collections.map((c) => ({
                      value: c.question_collection_id,
                      label: c.title,
                    })),
                  ]}
                  value={collectionFilter}
                  onSelect={(v) => setCollectionFilter(v)}
                />
              </div>
            )}
          </div>

          <div className="relative ml-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา"
              className="w-48 rounded-full bg-[#F4EFFF] px-3 py-1 pr-8 text-xs font-light text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3]"
            />
            <Search
              size={12}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[420px] overflow-y-auto rounded-xl bg-white">
          <div className="grid grid-cols-[40px_1fr_240px_120px_120px] items-center rounded-md bg-[#B7A3E3] px-4 py-2 text-xs font-light text-white">
            <div></div>
            <div>คำถาม</div>
            <div>หมวดหมู่ความรู้</div>
            <div>ระดับความยาก</div>
            <div className="text-center">ACTION</div>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-sm text-gray-400">กำลังโหลด...</p>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-red-500">{error}</p>
          ) : questions.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400">ไม่พบคำถาม</p>
          ) : (
            <ul className="divide-y divide-[#F4EFFF]">
              {questions.map((q, idx) => {
                const diff = difficultyLabel(q.difficulty_param);
                const isChecked = selected.has(q.question_id);
                const isOpen = expanded === q.question_id;
                const tags = q.knowledge_categories ?? [];
                const visible = tags.slice(0, 2);
                const remaining = tags.length - visible.length;
                return (
                  <li key={q.question_id}>
                    <div className="grid grid-cols-[40px_1fr_240px_120px_120px] items-center px-4 py-2 text-xs font-light text-[#575757] hover:bg-[#F4EFFF]/40">
                      <div>{(page - 1) * PAGE_SIZE + idx + 1}</div>
                      <div className="truncate pr-3">{q.question_text}</div>
                      <div className="flex flex-wrap items-center gap-1">
                        {visible.map((t) => (
                          <span
                            key={t.knowledge_category_id}
                            className="rounded-full bg-[#B7A3E3] px-2 py-0.5 text-[10px] text-white"
                          >
                            {t.name}
                          </span>
                        ))}
                        {remaining > 0 && (
                          <span className="rounded-full bg-[#D9CCF2] px-2 py-0.5 text-[10px] text-white">
                            +{remaining}
                          </span>
                        )}
                        {tags.length === 0 && (
                          <span className="text-[10px] text-gray-400">-</span>
                        )}
                      </div>
                      <div>
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] ${diff.className}`}
                        >
                          {diff.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded(isOpen ? null : q.question_id)
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-[#B7A3E3] text-white hover:bg-[#A48FD6] cursor-pointer"
                          aria-label="ดูรายละเอียด"
                        >
                          {isOpen ? (
                            <ChevronDown size={12} />
                          ) : (
                            <Eye size={12} />
                          )}
                        </button>
                        <label className="flex h-6 w-6 cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(q)}
                            className="h-4 w-4 accent-[#B7A3E3] cursor-pointer"
                            aria-label="เลือก"
                          />
                        </label>
                      </div>
                    </div>
                    {isOpen && (
                      <QuestionPreview question={q} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            เลือกแล้ว {selectedCount} ข้อ
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#B7A3E3] px-8 py-1.5 text-sm text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount < 1}
            className={`rounded-md px-10 py-1.5 text-sm text-white ${
              selectedCount < 1
                ? "bg-[#B7A3E3] opacity-50 cursor-not-allowed"
                : "bg-[#B7A3E3] hover:bg-[#A48FD6] cursor-pointer"
            }`}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterColumn({
  title,
  options,
  value,
  onSelect,
  disabled = false,
}: {
  title: string;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`w-1/2 border-r border-gray-200 last:border-r-0 ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <div className="border-b border-gray-200 px-3 py-1.5 text-xs text-[#575757]">
        {title}
      </div>
      <ul className="max-h-56 overflow-y-auto py-1">
        {options.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              onClick={() => onSelect(o.value)}
              className={`block w-full truncate px-3 py-1 text-left text-xs cursor-pointer ${
                value === o.value
                  ? "bg-[#B7A3E3] text-white"
                  : "text-[#575757] hover:bg-[#F4EFFF]"
              }`}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionPreview({ question }: { question: Question }) {
  return (
    <div className="border-t border-[#F4EFFF] bg-[#FBF8FF] px-6 py-3 text-xs font-light text-[#575757]">
      <p className="mb-2 whitespace-pre-wrap">{question.question_text}</p>
      <ul className="space-y-1">
        {question.choices.map((c, i) => (
          <li key={c.choice_id ?? i} className="flex items-start gap-2">
            <span
              className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                c.is_correct ? "bg-emerald-500" : "bg-gray-300"
              }`}
            />
            <span className={c.is_correct ? "font-medium" : ""}>
              {c.choice_text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
