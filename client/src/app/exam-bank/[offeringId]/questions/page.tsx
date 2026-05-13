"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Inbox,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  Upload,
} from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import KnowledgeCategoriesCell from "@/components/course/KnowledgeCategoriesCell";
import { difficultyLabel, Question } from "@/components/questionBank/types";
import QuestionEditorCard, {
  DraftQuestion,
  draftFromQuestion,
} from "@/components/questionBank/QuestionEditorCard";
import {
  DIFFICULTY_LEVEL_CONFIG,
  FIXED_CHOICE_COUNT,
} from "@/components/questionBank/questionEditorConfig";
import type { KnowledgeTag } from "@/components/questionBank/TagSelect";
import BulkUploadQuestion from "@/features/questionBank/components/BulkUploadQuestion";

interface ListResponse {
  data: Question[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
type DifficultyFilter = "" | "easy" | "medium" | "hard";

export default function FlatQuestionBankPage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [tags, setTags] = useState<KnowledgeTag[]>([]);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<
    { id: string; mode: "view" | "edit" } | null
  >(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(
    () => setPage(1),
    [debouncedSearch, categoryFilter, difficultyFilter, itemsPerPage],
  );

  const loadTags = useCallback(async () => {
    if (!offeringId) return;
    try {
      const t = await apiFetch<KnowledgeTag[]>(
        `/course-offerings/${offeringId}/knowledge-categories`,
      );
      setTags(t);
    } catch {
      // non-fatal
    }
  }, [offeringId]);

  const loadQuestions = useCallback(async () => {
    if (!offeringId) return;
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
          ?.message ?? "โหลดข้อมูลไม่สำเร็จ";
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
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    if (!isCategoryDropdownOpen) setCategorySearch("");
  }, [isCategoryDropdownOpen]);

  useEffect(() => {
    if (!isCategoryDropdownOpen) return;

    loadTags();

    const handlePointerDown = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCategoryDropdownOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCategoryDropdownOpen, loadTags]);

  useEffect(() => {
    if (tags.length === 0) return;

    setCategoryFilter((prev) => {
      const availableIds = new Set(tags.map((tag) => tag.knowledge_category_id));
      const next = prev.filter((id) => availableIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [tags]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleDelete = async (questionId: string) => {
    if (!confirm("ยืนยันการลบคำถามนี้?")) return;
    try {
      await apiFetch(
        `/course-offerings/${offeringId}/question-bank/questions/${questionId}`,
        { method: "DELETE" },
      );
      loadQuestions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "ลบไม่สำเร็จ";
      alert(msg);
    }
  };

  const startIndex = useMemo(
    () => (page - 1) * itemsPerPage,
    [page, itemsPerPage],
  );
  const firstVisibleItem = totalItems === 0 ? 0 : startIndex + 1;
  const lastVisibleItem = Math.min(startIndex + questions.length, totalItems);

  const selectedCategoryNames = useMemo(() => {
    const selectedIds = new Set(categoryFilter);
    return tags
      .filter((tag) => selectedIds.has(tag.knowledge_category_id))
      .map((tag) => tag.name);
  }, [categoryFilter, tags]);

  const filteredTags = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [categorySearch, tags]);

  const categoryFilterLabel =
    categoryFilter.length === 0
      ? "ทุกหมวดหมู่ความรู้"
      : selectedCategoryNames.length === 1
        ? selectedCategoryNames[0]
        : `${categoryFilter.length} หมวดหมู่ที่เลือก`;

  const toggleCategory = (id: string) =>
    setCategoryFilter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="mb-4 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/exam-bank/${offeringId}`)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#514667] ring-1 ring-transparent transition-colors hover:bg-[#FAF8FF] hover:ring-[#E7DDF8] cursor-pointer"
                aria-label="กลับ"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="flex items-center gap-2 text-xl font-semibold text-[#2F2A3A] sm:text-2xl">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                  <Inbox size={22} />
                </span>
                คลังคำถาม
              </h1>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
              <button
                type="button"
                onClick={() =>
                  router.push(`/exam-bank/${offeringId}/questions/create`)
                }
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] cursor-pointer"
              >
                <Plus size={16} />
                สร้างคำถาม
              </button>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#D9CCF2] bg-white px-5 text-sm font-semibold text-[#7C5BD9] shadow-sm transition-colors hover:bg-[#F4EFFF] cursor-pointer"
              >
                <Upload size={16} />
                Import CSV
              </button>
              <div className="relative flex-1 sm:w-80 sm:flex-none lg:w-96">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาคำถาม"
                  className="h-11 w-full rounded-xl bg-[#FAF8FF] px-4 pr-11 text-sm font-medium text-[#2F2A3A] placeholder:text-[#B7AFC6] outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
                />
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E7DDF8] sm:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <section className="shrink-0 lg:w-[330px]">
                <div className="mb-3 flex items-center gap-2.5 text-base font-semibold text-[#2F2A3A]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4EFFF] text-[#7C5BD9]">
                    <Filter size={18} />
                  </span>
                  <span>ระดับความยาก</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["", "ทั้งหมด"],
                      ["easy", "ง่าย"],
                      ["medium", "กลาง"],
                      ["hard", "ยาก"],
                    ] as [DifficultyFilter, string][]
                  ).map(([v, label]) => (
                    <button
                      key={v || "all"}
                      type="button"
                      onClick={() => setDifficultyFilter(v)}
                      className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold cursor-pointer transition-colors ${
                        difficultyFilter === v
                          ? "bg-[#B7A3E3] text-white shadow-sm"
                          : "bg-[#FAF8FF] text-[#514667] ring-1 ring-[#E7DDF8] hover:bg-[#F4EFFF]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="min-w-0 flex-1 border-t border-[#EFE8FB] pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div className="mb-3 flex items-center gap-2.5 text-base font-semibold text-[#2F2A3A]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4EFFF] text-[#7C5BD9]">
                    <Tags size={18} />
                  </span>
                  <span>หมวดหมู่ความรู้</span>
                </div>
                <div ref={categoryDropdownRef} className="relative max-w-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setIsCategoryDropdownOpen((open) => !open)
                    }
                    className="flex h-11 w-full items-center justify-between gap-3 rounded-xl bg-[#FAF8FF] px-4 text-left text-sm font-semibold text-[#2F2A3A] ring-1 ring-[#E7DDF8] transition hover:bg-[#F4EFFF] focus:outline-none focus:ring-2 focus:ring-[#B7A3E3] cursor-pointer"
                    aria-expanded={isCategoryDropdownOpen}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {categoryFilterLabel}
                    </span>
                    {categoryFilter.length > 0 && (
                      <span className="rounded-full bg-[#B7A3E3] px-2 py-0.5 text-xs font-semibold text-white">
                        {categoryFilter.length}
                      </span>
                    )}
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-[#7C5BD9] transition-transform ${
                        isCategoryDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isCategoryDropdownOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-[#D9CCF2]">
                      <div className="border-b border-[#EFE8FB] p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#2F2A3A]">
                              เลือกหมวดหมู่ความรู้
                            </p>
                            <p className="mt-0.5 text-xs font-medium text-[#7A7287]">
                              {categoryFilter.length === 0
                                ? "กำลังแสดงทุกหมวดหมู่"
                                : `เลือกอยู่ ${categoryFilter.length} หมวดหมู่`}
                            </p>
                          </div>
                          {categoryFilter.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setCategoryFilter([])}
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
                            value={categorySearch}
                            onChange={(event) =>
                              setCategorySearch(event.target.value)
                            }
                            placeholder="ค้นหาหมวดหมู่ความรู้"
                            className="h-9 w-full rounded-lg bg-[#FAF8FF] pl-9 pr-3 text-sm font-medium text-[#2F2A3A] placeholder:text-[#B7AFC6] outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
                            autoComplete="off"
                          />
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto p-2">
                        <button
                          type="button"
                          onClick={() => setCategoryFilter([])}
                          className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                            categoryFilter.length === 0
                              ? "bg-[#F4EFFF] text-[#7C5BD9]"
                              : "text-[#514667] hover:bg-[#FAF8FF]"
                          }`}
                        >
                          <span>ทุกหมวดหมู่ความรู้</span>
                          {categoryFilter.length === 0 && (
                            <span className="text-xs">เลือกอยู่</span>
                          )}
                        </button>

                        {filteredTags.length > 0 ? (
                          filteredTags.map((t) => {
                            const active = categoryFilter.includes(
                              t.knowledge_category_id,
                            );
                            return (
                              <button
                                key={t.knowledge_category_id}
                                type="button"
                                onClick={() =>
                                  toggleCategory(t.knowledge_category_id)
                                }
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer ${
                                  active
                                    ? "bg-[#F4EFFF] text-[#7C5BD9]"
                                    : "text-[#2F2A3A] hover:bg-[#FAF8FF]"
                                }`}
                                title={t.name}
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
                                  {t.name}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <p className="px-3 py-3 text-sm font-medium text-[#7A7287]">
                            ไม่พบหมวดหมู่ความรู้
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
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

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
            <div className="grid grid-cols-[60px_1fr_200px_140px_132px] items-center bg-[#B7A3E3] px-6 py-4 text-[15px] font-semibold text-white [&>div:nth-child(3)]:text-center [&>div:nth-child(4)]:text-center">
              <div>ลำดับ</div>
              <div>คำถาม</div>
              <div>หมวดหมู่ความรู้</div>
              <div>ระดับความยาก</div>
              <div className="text-center">จัดการ</div>
            </div>

            {loading ? (
              <p className="px-6 py-6 text-sm font-medium text-[#7A7287]">กำลังโหลด...</p>
            ) : error ? (
              <p className="px-6 py-6 text-sm font-medium text-red-500">{error}</p>
            ) : questions.length === 0 ? (
              <p className="px-6 py-6 text-sm font-medium text-[#7A7287]">ไม่มีคำถาม</p>
            ) : (
              <ul className="divide-y divide-[#EFE8FB]">
                {questions.map((q, idx) => {
                  const diff = difficultyLabel(q.difficulty_param);
                  const isOpen = expanded?.id === q.question_id;
                  const isViewOpen = isOpen && expanded?.mode === "view";
                  const isEditOpen = isOpen && expanded?.mode === "edit";
                  return (
                    <li key={q.question_id}>
                      <div className="grid grid-cols-[60px_1fr_200px_140px_132px] items-center px-6 py-4 text-[15px] font-medium text-[#514667] hover:bg-[#FAF8FF]">
                        <div>{startIndex + idx + 1}</div>
                        <div className="truncate pr-3 font-semibold text-[#2F2A3A]">{q.question_text}</div>
                        <div className="flex justify-center">
                          <KnowledgeCategoriesCell
                            categories={q.knowledge_categories}
                          />
                        </div>
                        <div className="text-center">
                          <span
                            className={`inline-block rounded-full px-3.5 py-1 text-[15px] font-semibold ${diff.className}`}
                          >
                            {diff.label}
                          </span>
                        </div>
                        <div className="flex justify-center">
                          <div className="flex items-center rounded-xl border border-[#E7DDF8] bg-[#FAF8FF] p-1">
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded(
                                  isViewOpen
                                    ? null
                                    : { id: q.question_id, mode: "view" },
                                )
                              }
                              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                                isViewOpen
                                  ? "bg-white text-[#7C5BD9] shadow-sm"
                                  : "text-[#7C5BD9] hover:bg-white"
                              }`}
                              title="ดูรายละเอียด"
                              aria-label="ดูรายละเอียด"
                            >
                              {isViewOpen ? (
                                <ChevronDown size={18} />
                              ) : (
                                <Eye size={18} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded(
                                  isEditOpen
                                    ? null
                                    : { id: q.question_id, mode: "edit" },
                                )
                              }
                              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                                isEditOpen
                                  ? "bg-white text-[#7C5BD9] shadow-sm"
                                  : "text-[#7C5BD9] hover:bg-white"
                              }`}
                              title="แก้ไข"
                              aria-label="แก้ไข"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(q.question_id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 cursor-pointer"
                              title="ลบ"
                              aria-label="ลบ"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {isViewOpen && <ExpandedRow question={q} />}
                      {isEditOpen && (
                        <EditQuestionRow
                          question={q}
                          tags={tags}
                          offeringId={offeringId}
                          onCancel={() => setExpanded(null)}
                          onSaved={() => {
                            setExpanded(null);
                            loadQuestions();
                          }}
                        />
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
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
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
        </main>
      </div>
      <BulkUploadQuestion
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        offeringId={offeringId}
        onSuccess={() => loadQuestions()}
      />
    </Navbar>
  );
}

function ExpandedRow({ question }: { question: Question }) {
  const longText = question.question_text.length > 280;
  const questionTextSize = longText ? "text-sm" : "text-base";
  const parameterItems = [
    {
      label: "ความยาก",
      value: question.difficulty_param ?? "-",
    },
    {
      label: "อำนาจการจำแนก",
      value: question.discrimination_param ?? "-",
    },
    {
      label: "โอกาสการเดา",
      value: question.guessing_param ?? "-",
    },
  ];
  const correctChoiceCount = question.choices.filter(
    (choice) => choice.is_correct,
  ).length;

  return (
    <div className="border-t border-[#EFE8FB] bg-[#FBF8FF] px-6 py-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <p className="text-sm font-semibold text-[#7C5BD9]">คำถาม</p>
            <p
              className={`mt-2 whitespace-pre-wrap break-words font-medium leading-relaxed text-[#2F2A3A] ${questionTextSize}`}
            >
              {question.question_text}
            </p>
          </section>

          <aside className="rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#E7DDF8]">
            <p className="text-sm font-semibold text-[#2F2A3A]">
              ค่าพารามิเตอร์ข้อสอบ
            </p>
            <dl className="mt-3 grid gap-2">
              {parameterItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-[#EFE8FB]"
                >
                  <dt className="text-sm font-medium text-[#7A7287]">
                    {item.label}
                  </dt>
                  <dd className="text-sm font-semibold text-[#2F2A3A]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#2F2A3A]">ตัวเลือก</p>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                เฉลย {correctChoiceCount} ข้อ
              </span>
            </div>
            <ul className="mt-3 grid gap-2">
              {question.choices.map((choice, index) => (
                <li
                  key={choice.choice_id ?? index}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 ring-1 ${
                    choice.is_correct
                      ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                      : "bg-[#FAF8FF] text-[#2F2A3A] ring-[#EFE8FB]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      choice.is_correct
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-[#7C5BD9] ring-1 ring-[#D9CCF2]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-sm font-medium leading-relaxed">
                    {choice.choice_text}
                  </span>
                  {choice.is_correct && (
                    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      <CheckCircle2 size={14} />
                      คำตอบถูก
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <aside className="rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#E7DDF8]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                  <Tags size={16} />
                </span>
                <p className="text-sm font-semibold text-[#2F2A3A]">
                  หมวดหมู่ความรู้
                </p>
              </div>
              {question.knowledge_categories.length > 0 && (
                <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  มี {question.knowledge_categories.length} หมวดหมู่
                </span>
              )}
            </div>

            <div className="mt-3 max-h-44 overflow-y-auto rounded-xl bg-white p-2 ring-1 ring-[#EFE8FB]">
              {question.knowledge_categories.length > 0 ? (
                <ol className="space-y-1.5">
                  {question.knowledge_categories.map((tag, index) => (
                    <li
                      key={tag.knowledge_category_id}
                      className="flex items-start gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-[#FAF8FF]"
                      title={tag.name}
                    >
                      <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F4EFFF] text-[11px] font-semibold text-[#7C5BD9]">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm font-medium leading-relaxed text-[#2F2A3A]">
                        {tag.name}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-2.5 py-2 text-sm font-medium text-[#7A7287]">
                  ไม่มีหมวดหมู่ความรู้
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function EditQuestionRow({
  question,
  tags,
  offeringId,
  onCancel,
  onSaved,
}: {
  question: Question;
  tags: KnowledgeTag[];
  offeringId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const normalizeDraftChoices = (input: DraftQuestion): DraftQuestion => {
    const nextChoices = [...input.choices];

    if (nextChoices.length > FIXED_CHOICE_COUNT) {
      nextChoices.splice(FIXED_CHOICE_COUNT);
    }

    while (nextChoices.length < FIXED_CHOICE_COUNT) {
      nextChoices.push({ choice_text: "", is_correct: false });
    }

    return { ...input, choices: nextChoices };
  };

  const [draft, setDraft] = useState<DraftQuestion>(() =>
    normalizeDraftChoices(draftFromQuestion(question)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (d: DraftQuestion) => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(
        `/course-offerings/${offeringId}/question-bank/questions/${question.question_id}`,
        {
          method: "PATCH",
          data: {
            question_text: d.question_text.trim(),
            question_type: "MCQ_SINGLE",
            choices: d.choices.map((c, idx) => ({
              choice_text: c.choice_text.trim(),
              is_correct: c.is_correct,
              display_order: idx,
            })),
            difficulty_param: Number(d.difficulty_param),
            discrimination_param: Number(d.discrimination_param),
            guessing_param: Number(d.guessing_param),
            knowledge_category_ids: d.knowledge_category_ids,
          },
        },
      );
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? "บันทึกไม่สำเร็จ";
      setError(Array.isArray(msg) ? msg.join("; ") : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-[#F4EFFF] bg-[#FBF8FF] px-6 py-4">
      {error && (
        <p className="mb-3 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      <QuestionEditorCard
        index={0}
        draft={draft}
        tags={tags}
        hideHeader
        fixedChoiceCount={FIXED_CHOICE_COUNT}
        difficultyOptions={DIFFICULTY_LEVEL_CONFIG}
        saving={saving}
        onChange={setDraft}
        onConfirm={handleConfirm}
        onCancel={onCancel}
        onDelete={onCancel}
      />
    </div>
  );
}
