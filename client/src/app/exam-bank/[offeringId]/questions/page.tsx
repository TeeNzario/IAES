"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  Eye,
  Inbox,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import Pagination from "@/components/questionBank/Pagination";
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
type DifficultyFilter = "" | "easy" | "medium" | "hard";

export default function FlatQuestionBankPage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [tags, setTags] = useState<KnowledgeTag[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<
    { id: string; mode: "view" | "edit" } | null
  >(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, categoryFilter, difficultyFilter]);

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
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryFilter.length > 0)
        params.set("category_ids", categoryFilter.join(","));
      const data = await apiFetch<ListResponse>(
        `/course-offerings/${offeringId}/question-bank/questions?${params}`,
      );
      let rows = data.data;
      // Difficulty filter is client-side (server only filters by category/search).
      if (difficultyFilter) {
        rows = rows.filter((q) => {
          const v = q.difficulty_param;
          if (v === null || v === undefined) return false;
          if (difficultyFilter === "easy") return v < 0;
          if (difficultyFilter === "medium") return v === 0;
          return v > 0;
        });
      }
      setQuestions(rows);
      setTotalPages(Math.max(1, data.pagination.totalPages));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "โหลดข้อมูลไม่สำเร็จ";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [offeringId, page, debouncedSearch, categoryFilter, difficultyFilter]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

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

  const startIndex = useMemo(() => (page - 1) * PAGE_SIZE, [page]);

  const toggleCategory = (id: string) =>
    setCategoryFilter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/exam-bank/${offeringId}`)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#575757] hover:bg-white cursor-pointer"
                aria-label="กลับ"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="flex items-center gap-2 text-xl font-light text-[#575757]">
                <Inbox size={22} />
                คลังคำถาม
              </h1>
              <button
                type="button"
                onClick={() =>
                  router.push(`/exam-bank/${offeringId}/questions/create`)
                }
                className="ml-2 flex items-center gap-1 rounded-full bg-[#B7A3E3] px-4 py-1.5 text-sm font-light text-white shadow-sm hover:bg-[#A48FD6] cursor-pointer"
              >
                <Plus size={14} />
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

          {/* Filters */}
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <span className="text-xs font-light text-gray-500">
              ระดับความยาก:
            </span>
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
                className={`rounded-full px-3 py-1 text-xs cursor-pointer ${
                  difficultyFilter === v
                    ? "bg-[#B7A3E3] text-white"
                    : "bg-[#F4EFFF] text-[#575757] hover:bg-[#E9E0FA]"
                }`}
              >
                {label}
              </button>
            ))}

            {tags.length > 0 && (
              <>
                <span className="ml-3 text-xs font-light text-gray-500">
                  หมวดหมู่:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => {
                    const active = categoryFilter.includes(
                      t.knowledge_category_id,
                    );
                    return (
                      <button
                        key={t.knowledge_category_id}
                        type="button"
                        onClick={() => toggleCategory(t.knowledge_category_id)}
                        className={`rounded-full px-3 py-1 text-xs cursor-pointer ${
                          active
                            ? "bg-[#B7A3E3] text-white"
                            : "bg-[#F4EFFF] text-[#575757] hover:bg-[#E9E0FA]"
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
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
              <p className="px-6 py-6 text-sm text-gray-400">ไม่มีคำถาม</p>
            ) : (
              <ul className="divide-y divide-[#F4EFFF]">
                {questions.map((q, idx) => {
                  const diff = difficultyLabel(q.difficulty_param);
                  const isOpen = expanded?.id === q.question_id;
                  const isViewOpen = isOpen && expanded?.mode === "view";
                  const isEditOpen = isOpen && expanded?.mode === "edit";
                  const visibleTags = q.knowledge_categories.slice(0, 2);
                  const remaining =
                    q.knowledge_categories.length - visibleTags.length;
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
                          {q.knowledge_categories.length === 0 && (
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
                              setExpanded(
                                isViewOpen
                                  ? null
                                  : { id: q.question_id, mode: "view" },
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#B7A3E3] text-white hover:bg-[#A48FD6] cursor-pointer"
                            aria-label="ดูรายละเอียด"
                          >
                            {isViewOpen ? (
                              <ChevronDown size={14} />
                            ) : (
                              <Eye size={14} />
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
                            className={`flex h-7 w-7 items-center justify-center rounded-md cursor-pointer ${
                              isEditOpen
                                ? "bg-[#B7A3E3] text-white hover:bg-[#A48FD6]"
                                : "border border-[#B7A3E3] text-[#B7A3E3] hover:bg-[#F4EFFF]"
                            }`}
                            aria-label="แก้ไข"
                          >
                            <Pencil size={14} />
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
          <span className="text-[11px] text-gray-400">อำนาจการจำแนก: </span>
          {question.discrimination_param ?? "-"}
        </div>
        <div>
          <span className="text-[11px] text-gray-400">โอกาสการเดา: </span>
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
