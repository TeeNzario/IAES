"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  Eye,
  Inbox,
  Search,
  Trash2,
} from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import Pagination from "@/components/questionBank/Pagination";
import { difficultyLabel, Question } from "@/components/questionBank/types";

interface CollectionInfo {
  question_collection_id: string;
  title: string;
  description: string | null;
  question_bank_years: { academic_year: number };
}

interface ListResponse {
  data: Question[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const PAGE_SIZE = 10;

export default function QuestionListPage() {
  const router = useRouter();
  const { offeringId, year, collectionId } = useParams<{
    offeringId: string;
    year: string;
    collectionId: string;
  }>();

  const [collection, setCollection] = useState<CollectionInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 on new search.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadCollection = useCallback(async () => {
    if (!offeringId || !collectionId) return;
    try {
      const data = await apiFetch<CollectionInfo>(
        `/course-offerings/${offeringId}/question-bank/collections/${collectionId}`,
      );
      setCollection(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "โหลดข้อมูลคอลเลกชันไม่สำเร็จ";
      setError(msg);
    }
  }, [offeringId, collectionId]);

  const loadQuestions = useCallback(async () => {
    if (!offeringId || !collectionId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const data = await apiFetch<ListResponse>(
        `/course-offerings/${offeringId}/question-bank/collections/${collectionId}/questions?${params}`,
      );
      setQuestions(data.data);
      setTotalPages(Math.max(1, data.pagination.totalPages));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "โหลดข้อมูลไม่สำเร็จ";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [offeringId, collectionId, page, debouncedSearch]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

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
      // Reload current page.
      loadQuestions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "ลบไม่สำเร็จ";
      alert(msg);
    }
  };

  const startIndex = useMemo(() => (page - 1) * PAGE_SIZE, [page]);

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(`/course/${offeringId}/question-bank/${year}`)
                }
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#575757] hover:bg-white cursor-pointer"
                aria-label="กลับ"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="flex items-center gap-2 text-xl font-light text-[#575757]">
                <Inbox size={22} />
                คลังคำถาม
                {collection && (
                  <span className="text-sm font-light text-gray-400">
                    / {year} / {collection.title}
                  </span>
                )}
              </h1>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/course/${offeringId}/question-bank/${year}/${collectionId}/create`,
                  )
                }
                className="ml-2 rounded-full bg-[#B7A3E3] px-4 py-1.5 text-sm font-light text-white shadow-sm hover:bg-[#A48FD6] cursor-pointer"
              >
                สร้างคำถาม
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาคำถาม"
                className="w-56 rounded-full bg-white px-4 py-2 pr-9 text-sm font-light text-[#575757] placeholder-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-[#B7A3E3]"
              />
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {/* Header row */}
            <div className="grid grid-cols-[60px_1fr_240px_140px_120px] items-center bg-[#B7A3E3] px-6 py-3 text-sm font-light text-white">
              <div>ลำดับ</div>
              <div>คำถาม</div>
              <div>หมวดหมู่ความรู้</div>
              <div>ระดับความยาก</div>
              <div className="text-center">ACTION</div>
            </div>

            {loading ? (
              <p className="px-6 py-6 text-sm text-gray-400">กำลังโหลด...</p>
            ) : error ? (
              <p className="px-6 py-6 text-sm text-red-500">{error}</p>
            ) : questions.length === 0 ? (
              <p className="px-6 py-6 text-sm text-gray-400">
                ยังไม่มีคำถามในชุดนี้
              </p>
            ) : (
              <ul className="divide-y divide-[#F4EFFF]">
                {questions.map((q, idx) => {
                  const diff = difficultyLabel(q.difficulty_param);
                  const isOpen = expanded === q.question_id;
                  const tags = q.knowledge_categories;
                  const visibleTags = tags.slice(0, 2);
                  const remaining = tags.length - visibleTags.length;
                  return (
                    <li key={q.question_id}>
                      <div className="grid grid-cols-[60px_1fr_240px_140px_120px] items-center px-6 py-3 text-sm font-light text-[#575757] hover:bg-[#F4EFFF]/40">
                        <div>{startIndex + idx + 1}</div>
                        <div className="truncate pr-3">{q.question_text}</div>
                        <div className="flex flex-wrap items-center gap-1">
                          {visibleTags.map((t) => (
                            <span
                              key={t.knowledge_category_id}
                              className="rounded-full bg-[#B7A3E3] px-2 py-0.5 text-[11px] text-white"
                            >
                              {t.name}
                            </span>
                          ))}
                          {remaining > 0 && (
                            <span className="rounded-full bg-[#D9CCF2] px-2 py-0.5 text-[11px] text-white">
                              +{remaining}
                            </span>
                          )}
                          {tags.length === 0 && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                        <div>
                          <span
                            className={`inline-block rounded-full px-3 py-0.5 text-xs ${diff.className}`}
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
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#B7A3E3] text-white hover:bg-[#A48FD6] cursor-pointer"
                            aria-label="ดูรายละเอียด"
                          >
                            {isOpen ? (
                              <ChevronDown size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(q.question_id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
                            aria-label="ลบ"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <ExpandedRow question={q} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-end">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </div>
        </main>
      </div>
    </Navbar>
  );
}

function ExpandedRow({ question }: { question: Question }) {
  // Auto-shrink font when content is long, per spec.
  const longText = question.question_text.length > 280;
  const textCls = longText ? "text-xs" : "text-sm";

  return (
    <div className="border-t border-[#F4EFFF] bg-[#FBF8FF] px-6 py-4">
      <div className="mb-3">
        <p className="mb-1 text-[11px] font-medium text-[#B7A3E3]">คำถาม</p>
        <p
          className={`whitespace-pre-wrap font-light text-[#575757] ${textCls}`}
        >
          {question.question_text}
        </p>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-[11px] font-medium text-[#B7A3E3]">ตัวเลือก</p>
        <ul className="space-y-1">
          {question.choices.map((c, i) => (
            <li
              key={c.choice_id ?? i}
              className={`flex items-start gap-2 ${textCls}`}
            >
              <span
                className={`mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                  c.is_correct ? "bg-emerald-500" : "bg-gray-300"
                }`}
              />
              <span
                className={`font-light text-[#575757] ${
                  c.is_correct ? "font-medium" : ""
                }`}
              >
                {c.choice_text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-4 text-xs font-light text-[#575757]">
        <div>
          <span className="text-[11px] text-gray-400">ความยาก: </span>
          {question.difficulty_param ?? "-"}
        </div>
        <div>
          <span className="text-[11px] text-gray-400">การแจกแจง: </span>
          {question.discrimination_param ?? "-"}
        </div>
        <div>
          <span className="text-[11px] text-gray-400">การเดา: </span>
          {question.guessing_param ?? "-"}
        </div>
      </div>

      {question.knowledge_categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {question.knowledge_categories.map((t) => (
            <span
              key={t.knowledge_category_id}
              className="rounded-full bg-[#B7A3E3] px-2.5 py-0.5 text-[11px] text-white"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
