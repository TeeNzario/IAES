"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Search,
  Tags,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import KnowledgeCategoriesCell from "@/components/course/KnowledgeCategoriesCell";
import {
  difficultyLabel,
  Question,
} from "@/components/questionBank/types";
import type { KnowledgeTag } from "@/components/questionBank/TagSelect";

interface ListResponse {
  data: Question[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const MAX_VISIBLE_CATEGORY_OPTIONS = 40;
type DifficultyFilter = "" | "easy" | "medium" | "hard";

const DIFFICULTY_FILTER_OPTIONS: {
  value: DifficultyFilter;
  label: string;
}[] = [
  { value: "", label: "ทั้งหมด" },
  { value: "easy", label: "ง่าย" },
  { value: "medium", label: "กลาง" },
  { value: "hard", label: "ยาก" },
];

interface Props {
  offeringId: string;
  /** Full Question objects already chosen on the parent page (pre-checked). */
  initialSelected: Question[];
  onCancel: () => void;
  /** Called with the final selected list (Question objects). */
  onConfirm: (selected: Question[]) => void;
}

/**
 * Modal: "เลือกคำถาม". Course-wide searchable question list with filters
 * for knowledge categories and difficulty, multi-select,
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
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("");

  // Filter option lists.
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
  const [categoryExpanded, setCategoryExpanded] = useState<string | null>(null);

  /**
   * Master selection map keyed by question_id. Survives pagination/filtering.
   */
  const [selected, setSelected] = useState<Map<string, Question>>(() => {
    const m = new Map<string, Question>();
    initialSelected.forEach((q) => m.set(q.question_id, q));
    return m;
  });

  // Load categories.
  useEffect(() => {
    apiFetch<KnowledgeTag[]>(
      `/course-offerings/${offeringId}/knowledge-categories`,
    )
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [offeringId]);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(
    () => setPage(1),
    [debouncedSearch, categoryFilter, difficultyFilter, itemsPerPage],
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
      if (categoryFilter.length > 0)
        params.set("category_ids", categoryFilter.join(","));
      if (difficultyFilter) params.set("difficulty", difficultyFilter);
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
    categoryFilter,
    difficultyFilter,
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

  const toggleCategoryPreview = (questionId: string) => {
    setCategoryExpanded((current) =>
      current === questionId ? null : questionId,
    );
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setCategoryFilter((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  };

  const selectedCount = selected.size;
  const firstVisibleItem = totalItems === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const lastVisibleItem = Math.min(page * itemsPerPage, totalItems);

  const handleConfirm = () => {
    onConfirm(Array.from(selected.values()));
  };

  const clearFilters = () => {
    setCategoryFilter([]);
    setCategorySearch("");
    setDifficultyFilter("");
  };

  const filterActive = difficultyFilter !== "" || categoryFilter.length > 0;

  const activeChipLabel = useMemo(() => {
    if (!filterActive) return "ทั้งหมด";
    const parts: string[] = [];
    if (difficultyFilter) {
      const selectedDifficulty = DIFFICULTY_FILTER_OPTIONS.find(
        (option) => option.value === difficultyFilter,
      );
      if (selectedDifficulty) parts.push(selectedDifficulty.label);
    }
    if (categoryFilter.length > 0) {
      parts.push(`${categoryFilter.length} หมวดหมู่`);
    }
    return parts.join(" · ");
  }, [filterActive, difficultyFilter, categoryFilter]);

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) =>
      category.name.toLowerCase().includes(query),
    );
  }, [categories, categorySearch]);

  const orderedVisibleCategories = useMemo(() => {
    const selectedIds = new Set(categoryFilter);
    return [...filteredCategories]
      .sort((a, b) => {
        const aSelected = selectedIds.has(a.knowledge_category_id);
        const bSelected = selectedIds.has(b.knowledge_category_id);
        return Number(bSelected) - Number(aSelected);
      })
      .slice(0, MAX_VISIBLE_CATEGORY_OPTIONS);
  }, [filteredCategories, categoryFilter]);

  const hiddenCategoryCount = Math.max(
    0,
    filteredCategories.length - orderedVisibleCategories.length,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-6 sm:p-6">
      <div className="relative max-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-[#E7DDF8] sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-tight text-[#2F2A3A]">
              เลือกคำถาม
            </h2>
            <p className="mt-1 text-sm font-normal text-[#7A7287]">
              ค้นหา กรอง และเลือกคำถามสำหรับชุดข้อสอบนี้
            </p>
          </div>
          <div className="flex w-fit items-center gap-2">
            <span className="inline-flex h-9 w-fit items-center rounded-xl bg-[#F4EFFF] px-4 text-sm font-semibold text-[#7C5BD9]">
              เลือกแล้ว {selectedCount} ข้อ
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#7A7287] ring-1 ring-[#E7DDF8] transition-colors hover:bg-[#F4EFFF] hover:text-[#7C5BD9] cursor-pointer"
              aria-label="ปิดหน้าต่างเลือกคำถาม"
              title="ปิด"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <span
            className={`inline-flex h-9 w-fit items-center rounded-xl border px-3 text-sm ${
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
              className={`flex h-9 min-w-28 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition-colors cursor-pointer ${
                filterOpen || filterActive
                  ? "bg-[#B7A3E3] text-white hover:bg-[#A48FD6]"
                  : "bg-[#F4EFFF] text-[#7C5BD9] hover:bg-[#E9E0FA]"
              }`}
              aria-label="กรอง"
            >
              <Filter size={15} />
              ตัวกรอง
            </button>

            {filterOpen && (
              <div className="absolute left-0 top-full z-30 mt-2 w-[640px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#E7DDF8] bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold text-[#2F2A3A]">
                      ตัวกรองคำถาม
                    </p>
                    <p className="mt-0.5 text-[13px] font-medium text-[#7A7287]">
                      กรองด้วยระดับความยากและหมวดหมู่ความรู้
                    </p>
                  </div>
                  {filterActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                    >
                      ล้างทั้งหมด
                    </button>
                  )}
                </div>

                <section className="rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#E7DDF8]">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#514667]">
                      ระดับความยาก
                    </span>
                    {difficultyFilter && (
                      <button
                        type="button"
                        onClick={() => setDifficultyFilter("")}
                        className="text-[13px] font-medium text-[#B7A3E3] hover:underline"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DIFFICULTY_FILTER_OPTIONS.map((option) => (
                      <button
                        key={option.value || "all"}
                        type="button"
                        onClick={() => setDifficultyFilter(option.value)}
                        className={`inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors cursor-pointer ${
                          difficultyFilter === option.value
                            ? "bg-[#B7A3E3] text-white shadow-sm"
                            : "bg-white text-[#514667] ring-1 ring-[#E7DDF8] hover:bg-[#F4EFFF]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="mt-3 rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#E7DDF8]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                        <Tags size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#514667]">
                          หมวดหมู่ความรู้
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-[#7A7287]">
                          {categoryFilter.length > 0
                            ? `เลือกแล้ว ${categoryFilter.length} หมวดหมู่`
                            : `${categories.length} หมวดหมู่ที่เลือกได้`}
                        </p>
                      </div>
                    </div>
                    {categoryFilter.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCategoryFilter([])}
                        className="w-fit text-[13px] font-medium text-[#B7A3E3] hover:underline"
                      >
                        ล้างหมวดหมู่
                      </button>
                    )}
                  </div>

                  <div className="relative mt-3">
                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8F84A3]"
                    />
                    <input
                      type="search"
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                      placeholder="ค้นหาหมวดหมู่ความรู้"
                      className="h-9 w-full rounded-xl bg-white pl-9 pr-3 text-[13px] font-medium text-[#2F2A3A] placeholder:text-[#B7AFC6] outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
                    />
                  </div>

                  <div className="mt-3 max-h-72 overflow-y-auto pr-1">
                    {filteredCategories.length > 0 ? (
                      <>
                        {hiddenCategoryCount > 0 && (
                          <div className="mb-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-[#7A7287] ring-1 ring-[#E7DDF8]">
                            แสดง {orderedVisibleCategories.length} จาก{" "}
                            {filteredCategories.length} หมวดหมู่
                            {categorySearch.trim()
                              ? ""
                              : " พิมพ์ค้นหาเพื่อจำกัดรายการ"}
                          </div>
                        )}
                        <div className="space-y-2">
                          {orderedVisibleCategories.map((category) => {
                            const active = categoryFilter.includes(
                              category.knowledge_category_id,
                            );

                            return (
                              <button
                                key={category.knowledge_category_id}
                              type="button"
                              onClick={() =>
                                toggleCategoryFilter(
                                  category.knowledge_category_id,
                                )
                              }
                                className={`flex min-h-[52px] items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer ${
                                  active
                                    ? "bg-white text-[#2F2A3A] ring-2 ring-[#B7A3E3]"
                                    : "bg-white text-[#2F2A3A] ring-1 ring-[#E7DDF8] hover:bg-[#F4EFFF]"
                                } focus:outline-none focus:ring-2 focus:ring-[#B7A3E3]`}
                                title={category.name}
                              >
                                <span
                                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
                                    active
                                      ? "border-[#7C5BD9] bg-[#7C5BD9]"
                                      : "border-[#D9CCF2] bg-white"
                                  }`}
                                >
                                  {active && (
                                    <span className="h-1.5 w-1.5 rounded-sm bg-white" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1 pr-3">
                                  <span className="block whitespace-normal break-words text-[13px] font-semibold leading-relaxed">
                                    {category.name}
                                  </span>
                                </span>
                                <span
                                  className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    active
                                      ? "bg-[#F4EFFF] text-[#7C5BD9]"
                                      : "bg-[#FAF8FF] text-[#7A7287] ring-1 ring-[#E7DDF8]"
                                  }`}
                                >
                                  {active ? "เลือกอยู่" : "เลือก"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="rounded-xl bg-white px-3 py-3 text-sm font-medium text-[#7A7287] ring-1 ring-[#E7DDF8]">
                        {categories.length === 0
                          ? "ไม่มีหมวดหมู่ความรู้ให้เลือก"
                          : "ไม่พบหมวดหมู่ความรู้"}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>

          <div className="relative w-full xl:ml-auto xl:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา"
              className="h-9 w-full rounded-xl bg-[#FAF8FF] px-4 pr-10 text-sm font-medium text-[#2F2A3A] placeholder:text-[#B7AFC6] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
            />
            <Search
              size={17}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
            />
          </div>
        </div>

        {totalItems > 0 && (
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex h-9 w-fit items-center rounded-xl bg-white px-4 text-sm font-medium text-[#514667] shadow-sm ring-1 ring-[#E7DDF8]">
              แสดง {firstVisibleItem}–{lastVisibleItem} จาก {totalItems}
            </span>

            <label className="relative block w-full sm:w-44">
              <span className="sr-only">จำนวนแถวต่อหน้า</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-9 w-full appearance-none rounded-xl bg-white px-4 pr-10 text-sm font-medium text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3] cursor-pointer"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    แสดง {size} แถว
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
              />
            </label>
          </div>
        )}

        <div className="max-h-[460px] overflow-x-auto overflow-y-auto rounded-2xl bg-white ring-1 ring-[#E7DDF8]">
          <div className="sticky top-0 z-[1] grid min-w-[1120px] grid-cols-[56px_minmax(360px,1fr)_220px_132px_220px_116px] items-center bg-[#B7A3E3] px-6 py-3 text-sm font-semibold text-white">
            <div></div>
            <div>คำถาม</div>
            <div>หมวดหมู่ความรู้</div>
            <div>ระดับความยาก</div>
            <div>พารามิเตอร์</div>
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
                return (
                  <li key={q.question_id}>
                    <div className="grid min-w-[1120px] grid-cols-[56px_minmax(360px,1fr)_220px_132px_220px_116px] items-center px-6 py-3.5 text-sm font-medium text-[#514667] hover:bg-[#FAF8FF]">
                      <div>{(page - 1) * itemsPerPage + idx + 1}</div>
                      <div className="pr-4 text-[15px] font-semibold leading-relaxed text-[#2F2A3A]">
                        {q.question_text}
                      </div>
                      <div className="flex items-center gap-2">
                        <KnowledgeCategoriesCell categories={tags} />
                        {tags.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleCategoryPreview(q.question_id)}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors cursor-pointer ${
                              categoryExpanded === q.question_id
                                ? "bg-[#B7A3E3] text-white ring-[#B7A3E3]"
                                : "bg-white text-[#7C5BD9] ring-[#E7DDF8] hover:bg-[#F4EFFF]"
                            }`}
                            title="ดูหมวดหมู่ความรู้"
                            aria-label="ดูหมวดหมู่ความรู้"
                          >
                            <Tags size={14} />
                          </button>
                        )}
                      </div>
                      <div>
                        <span
                          className={`inline-block min-w-14 rounded-full px-3 py-1 text-center text-sm font-semibold ${diff.className}`}
                        >
                          {diff.label}
                        </span>
                      </div>
                      <QuestionParameterPills question={q} />
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded(isOpen ? null : q.question_id)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7C5BD9] ring-1 ring-[#E7DDF8] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                          aria-label="ดูรายละเอียด"
                        >
                          {isOpen ? (
                            <ChevronDown size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                        <label className="flex h-8 w-8 cursor-pointer items-center justify-center">
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
                    {categoryExpanded === q.question_id && (
                      <KnowledgeCategoryPreview categories={tags} />
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
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] shadow-sm transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-80"
                aria-label="หน้าก่อนหน้า"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft size={17} strokeWidth={2.4} />
              </button>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#B7A3E3] px-3 text-sm font-semibold text-white shadow-sm">
                {page}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] shadow-sm transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-80"
                aria-label="หน้าถัดไป"
                title="หน้าถัดไป"
              >
                <ChevronRight size={17} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-xl border border-[#D9CCF2] bg-white px-6 text-sm font-semibold text-[#514667] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount < 1}
            className={`h-9 rounded-xl px-8 text-sm font-semibold text-white shadow-sm transition-colors ${
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

function QuestionParameterPills({ question }: { question: Question }) {
  const items = [
    { label: "b", value: question.difficulty_param, title: "ความยาก" },
    {
      label: "a",
      value: question.discrimination_param,
      title: "อำนาจการจำแนก",
    },
    { label: "c", value: question.guessing_param, title: "โอกาสการเดา" },
  ];

  return (
    <div className="grid grid-cols-3 gap-1 pr-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex h-7 min-w-0 items-center justify-center gap-0.5 whitespace-nowrap rounded-lg bg-[#FAF8FF] px-1.5 text-[12px] font-semibold text-[#514667] ring-1 ring-[#E7DDF8]"
          title={item.title}
        >
          <span className="text-[#7C5BD9]">{item.label}</span>
          <span>{formatQuestionParam(item.value)}</span>
        </span>
      ))}
    </div>
  );
}

function QuestionPreview({ question }: { question: Question }) {
  const categories = question.knowledge_categories ?? [];
  const [showCategories, setShowCategories] = useState(
    categories.length > 0,
  );
  const parameterItems = [
    {
      label: "ความยาก (b)",
      value: formatQuestionParam(question.difficulty_param),
    },
    {
      label: "อำนาจการจำแนก (a)",
      value: formatQuestionParam(question.discrimination_param),
    },
    {
      label: "โอกาสการเดา (c)",
      value: formatQuestionParam(question.guessing_param),
    },
  ];

  return (
    <div className="border-t border-[#EFE8FB] bg-[#FAF8FF] px-6 py-5 text-[15px] font-normal text-[#514667]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="whitespace-pre-wrap text-base font-semibold leading-relaxed text-[#2F2A3A]">
          {question.question_text}
        </p>
        {categories.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCategories((current) => !current)}
            className="inline-flex h-9 w-fit shrink-0 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
          >
            <Tags size={15} />
            หมวดหมู่ {categories.length}
            <ChevronDown
              size={15}
              className={`transition-transform ${
                showCategories ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      <dl className="mb-4 grid gap-2 sm:grid-cols-3">
        {parameterItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#E7DDF8]"
          >
            <dt className="text-[13px] font-medium text-[#7A7287]">
              {item.label}
            </dt>
            <dd className="mt-1 text-[15px] font-semibold text-[#2F2A3A]">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <ul className="space-y-1.5">
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

      {showCategories && (
        <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-[#E7DDF8]">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#2F2A3A]">
            <Tags size={15} className="text-[#7C5BD9]" />
            หมวดหมู่ความรู้
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category, index) => (
              <span
                key={category.knowledge_category_id}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FAF8FF] px-3 py-1.5 text-sm font-semibold text-[#514667] ring-1 ring-[#E7DDF8]"
                title={category.name}
              >
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[#7C5BD9]">
                  {index + 1}
                </span>
                {category.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatQuestionParam(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function KnowledgeCategoryPreview({
  categories,
}: {
  categories: Question["knowledge_categories"];
}) {
  if (categories.length === 0) return null;

  return (
    <div className="border-t border-[#EFE8FB] bg-[#FAF8FF] px-6 py-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#2F2A3A]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
          <Tags size={15} />
        </span>
        หมวดหมู่ความรู้
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {categories.map((category, index) => (
          <span
            key={category.knowledge_category_id}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-[#514667] ring-1 ring-[#E7DDF8]"
            title={category.name}
          >
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F4EFFF] text-[11px] font-semibold text-[#7C5BD9]">
              {index + 1}
            </span>
            {category.name}
          </span>
        ))}
      </div>
    </div>
  );
}
