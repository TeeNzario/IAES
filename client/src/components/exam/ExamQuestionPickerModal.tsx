"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  difficultyLabel,
  Question,
} from "@/components/questionBank/types";
import type { KnowledgeTag } from "@/components/questionBank/TagSelect";
import TagSelect from "@/components/questionBank/TagSelect";

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

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

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
 * (academic year + collection + knowledge categories), multi-select,
 * per-row eye-expand preview, and pagination.
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
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  // Filter option lists.
  const [years, setYears] = useState<YearOption[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [categories, setCategories] = useState<KnowledgeTag[]>([]);

  // Data.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  /**
   * Master selection map keyed by question_id. Survives pagination/filtering.
   */
  const [selected, setSelected] = useState<Map<string, Question>>(() => {
    const m = new Map<string, Question>();
    initialSelected.forEach((q) => m.set(q.question_id, q));
    return m;
  });

  // Load years + categories.
  useEffect(() => {
    apiFetch<YearOption[]>(
      `/course-offerings/${offeringId}/question-bank/years`,
    )
      .then(setYears)
      .catch(() => setYears([]));
    apiFetch<KnowledgeTag[]>(
      `/course-offerings/${offeringId}/knowledge-categories`,
    )
      .then(setCategories)
      .catch(() => setCategories([]));
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

  useEffect(
    () => setPage(1),
    [debouncedSearch, yearFilter, collectionFilter, categoryFilter, itemsPerPage],
  );

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(itemsPerPage),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (yearFilter !== "all") params.set("year", String(yearFilter));
      if (collectionFilter !== "all")
        params.set("collection_id", collectionFilter);
      if (categoryFilter.length > 0)
        params.set("category_ids", categoryFilter.join(","));
      const data = await apiFetch<ListResponse>(
        `/course-offerings/${offeringId}/question-bank/questions?${params}`,
      );
      setQuestions(data.data);
      setTotalItems(data.pagination.total);
      setTotalPages(Math.max(1, data.pagination.totalPages));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "โหลดคำถามไม่สำเร็จ";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    offeringId,
    page,
    itemsPerPage,
    debouncedSearch,
    yearFilter,
    collectionFilter,
    categoryFilter,
  ]);

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
  const firstVisibleItem = totalItems === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const lastVisibleItem = Math.min(page * itemsPerPage, totalItems);

  const handleConfirm = () => {
    onConfirm(Array.from(selected.values()));
  };

  const clearFilters = () => {
    setYearFilter("all");
    setCollectionFilter("all");
    setCategoryFilter([]);
  };

  const filterActive =
    yearFilter !== "all" ||
    collectionFilter !== "all" ||
    categoryFilter.length > 0;

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
    if (categoryFilter.length > 0) {
      parts.push(`${categoryFilter.length} หมวดหมู่`);
    }
    return parts.join(" · ");
  }, [filterActive, yearFilter, collectionFilter, categoryFilter, collections]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-6 sm:p-6">
      <div className="relative max-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-[#E7DDF8] sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#2F2A3A] sm:text-2xl">
              เลือกคำถาม
            </h2>
            <p className="mt-1 text-sm font-normal text-[#7A7287]">
              ค้นหา กรอง และเลือกคำถามสำหรับชุดข้อสอบนี้
            </p>
          </div>
          <span className="inline-flex h-10 w-fit items-center rounded-xl bg-[#F4EFFF] px-4 text-sm font-semibold text-[#7C5BD9]">
            เลือกแล้ว {selectedCount} ข้อ
          </span>
        </div>

        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <span
            className={`inline-flex h-10 w-fit items-center rounded-xl border px-3 text-sm ${
              filterActive
                ? "border-[#B7A3E3] bg-[#F4EFFF] font-semibold text-[#7C5BD9]"
                : "border-[#D9CCF2] font-semibold text-[#7C5BD9]"
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
              className={`flex h-10 min-w-28 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition-colors cursor-pointer ${
                filterOpen || filterActive
                  ? "bg-[#B7A3E3] text-white hover:bg-[#A48FD6]"
                  : "bg-[#F4EFFF] text-[#7C5BD9] hover:bg-[#E9E0FA]"
              }`}
              aria-label="กรอง"
            >
              <Filter size={16} />
              ตัวกรอง
            </button>

            {filterOpen && (
              <div className="absolute left-0 top-full z-10 mt-2 w-[420px] max-w-[92vw] overflow-hidden rounded-2xl border border-[#E7DDF8] bg-white shadow-lg">
                <div className="flex">
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
                <div className="border-t border-[#E7DDF8] px-3 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#514667]">
                      หมวดหมู่ความรู้
                    </span>
                    {categoryFilter.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCategoryFilter([])}
                        className="text-sm font-medium text-[#B7A3E3] hover:underline"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>
                  <TagSelect
                    options={categories}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    placeholder="เลือกหมวดหมู่ (เลือกได้หลายรายการ)"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="relative w-full xl:ml-auto xl:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา"
              className="h-10 w-full rounded-xl bg-[#FAF8FF] px-4 pr-10 text-sm font-medium text-[#2F2A3A] placeholder:text-[#B7AFC6] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
            />
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
            />
          </div>
        </div>

        {totalItems > 0 && (
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex h-10 w-fit items-center rounded-xl bg-white px-4 text-sm font-medium text-[#514667] shadow-sm ring-1 ring-[#E7DDF8]">
              แสดง {firstVisibleItem}–{lastVisibleItem} จาก {totalItems}
            </span>

            <label className="relative block w-full sm:w-44">
              <span className="sr-only">จำนวนแถวต่อหน้า</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-10 w-full appearance-none rounded-xl bg-white px-4 pr-10 text-sm font-medium text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3] cursor-pointer"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    แสดง {size} แถว
                  </option>
                ))}
              </select>
              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
              />
            </label>
          </div>
        )}

        <div className="max-h-[420px] overflow-y-auto rounded-2xl bg-white ring-1 ring-[#E7DDF8]">
          <div className="grid grid-cols-[48px_1fr_240px_140px_120px] items-center bg-[#B7A3E3] px-5 py-4 text-[15px] font-semibold text-white">
            <div></div>
            <div>คำถาม</div>
            <div>หมวดหมู่ความรู้</div>
            <div>ระดับความยาก</div>
            <div className="text-center">จัดการ</div>
          </div>

          {loading ? (
            <p className="px-5 py-6 text-sm font-medium text-[#7A7287]">กำลังโหลด...</p>
          ) : error ? (
            <p className="px-5 py-6 text-sm font-medium text-red-500">{error}</p>
          ) : questions.length === 0 ? (
            <p className="px-5 py-6 text-sm font-medium text-[#7A7287]">ไม่พบคำถาม</p>
          ) : (
            <ul className="divide-y divide-[#EFE8FB]">
              {questions.map((q, idx) => {
                const diff = difficultyLabel(q.difficulty_param);
                const isChecked = selected.has(q.question_id);
                const isOpen = expanded === q.question_id;
                const tags = q.knowledge_categories ?? [];
                const visible = tags.slice(0, 2);
                const remaining = tags.length - visible.length;
                return (
                  <li key={q.question_id}>
                    <div className="grid grid-cols-[48px_1fr_240px_140px_120px] items-center px-5 py-4 text-[15px] font-medium text-[#514667] hover:bg-[#FAF8FF]">
                      <div>{(page - 1) * itemsPerPage + idx + 1}</div>
                      <div className="truncate pr-3 font-semibold text-[#2F2A3A]">
                        {q.question_text}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {visible.map((t) => (
                          <span
                            key={t.knowledge_category_id}
                            className="rounded-full bg-[#B7A3E3] px-2.5 py-1 text-sm font-semibold text-white"
                          >
                            {t.name}
                          </span>
                        ))}
                        {remaining > 0 && (
                          <span className="rounded-full bg-[#D9CCF2] px-2.5 py-1 text-sm font-semibold text-white">
                            +{remaining}
                          </span>
                        )}
                        {tags.length === 0 && (
                          <span className="text-sm font-medium text-[#B7AFC6]">-</span>
                        )}
                      </div>
                      <div>
                        <span
                          className={`inline-block min-w-16 rounded-full px-3 py-1 text-center text-sm font-semibold ${diff.className}`}
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
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7C5BD9] ring-1 ring-[#E7DDF8] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                          aria-label="ดูรายละเอียด"
                        >
                          {isOpen ? (
                            <ChevronDown size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                        <label className="flex h-9 w-9 cursor-pointer items-center justify-center">
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

        {totalItems > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] shadow-sm transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-80"
                aria-label="หน้าก่อนหน้า"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft size={18} strokeWidth={2.4} />
              </button>
              <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#B7A3E3] px-3 text-sm font-semibold text-white shadow-sm">
                {page}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] shadow-sm transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-80"
                aria-label="หน้าถัดไป"
                title="หน้าถัดไป"
              >
                <ChevronRight size={18} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl border border-[#D9CCF2] bg-white px-6 text-sm font-semibold text-[#514667] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount < 1}
            className={`h-10 rounded-xl px-8 text-sm font-semibold text-white shadow-sm transition-colors ${
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
      className={`w-1/2 border-r border-[#E7DDF8] last:border-r-0 ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <div className="border-b border-[#E7DDF8] px-3 py-2 text-sm font-semibold text-[#514667]">
        {title}
      </div>
      <ul className="max-h-56 overflow-y-auto py-1">
        {options.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              onClick={() => onSelect(o.value)}
              className={`block w-full truncate px-3 py-1.5 text-left text-sm cursor-pointer ${
                value === o.value
                  ? "bg-[#B7A3E3] text-white"
                  : "font-medium text-[#514667] hover:bg-[#F4EFFF]"
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
    <div className="border-t border-[#EFE8FB] bg-[#FAF8FF] px-6 py-4 text-[15px] font-normal text-[#514667]">
      <p className="mb-2 whitespace-pre-wrap font-semibold text-[#2F2A3A]">
        {question.question_text}
      </p>
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
