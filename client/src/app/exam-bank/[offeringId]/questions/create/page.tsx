"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Plus, Upload } from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import QuestionEditorCard, {
  DraftQuestion,
  isDraftValid,
  makeEmptyDraft,
} from "@/components/questionBank/QuestionEditorCard";
import type { KnowledgeTag } from "@/components/questionBank/TagSelect";

interface Year {
  question_bank_year_id: string;
  academic_year: number;
}

interface Collection {
  question_collection_id: string;
  title: string;
}

const DEFAULT_COLLECTION_TITLE = "คำถามทั่วไป";

/**
 * Resolve (creating if necessary) a default question collection for this
 * course-offering so the flat "create question" flow doesn't expose the
 * year / collection concept to the user.
 */
async function resolveDefaultCollectionId(
  offeringId: string,
): Promise<string> {
  const years = await apiFetch<Year[]>(
    `/course-offerings/${offeringId}/question-bank/years`,
  );
  let yearRow = years.length > 0 ? years[0] : null;
  if (!yearRow) {
    const currentYear = new Date().getFullYear();
    yearRow = await apiFetch<Year>(
      `/course-offerings/${offeringId}/question-bank/years`,
      { method: "POST", data: { academic_year: currentYear } },
    );
  }
  const collections = await apiFetch<Collection[]>(
    `/course-offerings/${offeringId}/question-bank/years/${yearRow.academic_year}/collections`,
  );
  const existing = collections.find((c) => c.title === DEFAULT_COLLECTION_TITLE);
  if (existing) return existing.question_collection_id;
  if (collections.length > 0) return collections[0].question_collection_id;
  const created = await apiFetch<Collection>(
    `/course-offerings/${offeringId}/question-bank/years/${yearRow.academic_year}/collections`,
    { method: "POST", data: { title: DEFAULT_COLLECTION_TITLE } },
  );
  return created.question_collection_id;
}

export default function CreateFlatQuestionsPage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [tags, setTags] = useState<KnowledgeTag[]>([]);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([makeEmptyDraft()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInit = useCallback(async () => {
    if (!offeringId) return;
    try {
      const tagList = await apiFetch<KnowledgeTag[]>(
        `/course-offerings/${offeringId}/knowledge-categories`,
      );
      setTags(tagList);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "โหลดข้อมูลไม่สำเร็จ";
      setError(msg);
    }
  }, [offeringId]);

  useEffect(() => {
    loadInit();
  }, [loadInit]);

  const updateDraft = (id: string, next: DraftQuestion) =>
    setDrafts((prev) => prev.map((d) => (d.draft_id === id ? next : d)));

  const removeDraft = (id: string) =>
    setDrafts((prev) =>
      prev.length === 1 ? prev : prev.filter((d) => d.draft_id !== id),
    );

  const addDraft = () => setDrafts((prev) => [...prev, makeEmptyDraft()]);

  const allValid = drafts.every(isDraftValid);

  const handleSave = async () => {
    for (const [i, d] of drafts.entries()) {
      if (!isDraftValid(d)) {
        setError(`คำถามข้อ ${i + 1}: ข้อมูลยังไม่ครบถ้วน`);
        return;
      }
    }
    setError(null);
    setSaving(true);
    try {
      const collectionId = await resolveDefaultCollectionId(offeringId);
      await apiFetch(
        `/course-offerings/${offeringId}/question-bank/collections/${collectionId}/questions/bulk`,
        {
          method: "POST",
          data: {
            questions: drafts.map((d) => ({
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
            })),
          },
        },
      );
      router.push(`/exam-bank/${offeringId}/questions`);
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
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push(`/exam-bank/${offeringId}/questions`)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#575757] hover:bg-white cursor-pointer"
              aria-label="กลับ"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !allValid}
              aria-disabled={saving || !allValid}
              title={
                !allValid
                  ? "ทุกคำถามต้องกรอกข้อมูลให้ครบก่อนบันทึก"
                  : undefined
              }
              className={`rounded-md bg-white px-5 py-1.5 text-sm font-light text-[#575757] shadow-sm ${
                saving || !allValid
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[#F4EFFF] cursor-pointer"
              }`}
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>

          <div className="relative">
            <div className="rounded-2xl bg-[#B7A3E3] px-7 py-7 text-white shadow-sm">
              <h1 className="text-2xl font-light">สร้างคำถาม</h1>
              <p className="mt-1 text-sm font-light opacity-90">
                เพิ่มคำถามใหม่เข้าคลังคำถามของรายวิชานี้
              </p>
            </div>

            {/* Floating side toolbar */}
            <div className="absolute -right-14 top-2 hidden flex-col gap-2 lg:flex">
              <button
                type="button"
                onClick={addDraft}
                className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#B7A3E3] shadow-sm hover:bg-[#F4EFFF] cursor-pointer"
                aria-label="เพิ่มคำถาม"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                disabled
                title="นำเข้าคำถาม (เร็วๆ นี้)"
                className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#B7A3E3] shadow-sm opacity-60 cursor-not-allowed"
                aria-label="นำเข้าคำถาม"
              >
                <Upload size={16} />
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-5 space-y-5">
            {drafts.map((d, i) => (
              <QuestionEditorCard
                key={d.draft_id}
                index={i}
                draft={d}
                tags={tags}
                onChange={(next) => updateDraft(d.draft_id, next)}
                onDelete={() => removeDraft(d.draft_id)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addDraft}
            className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#B7A3E3] py-7 text-white shadow-sm hover:bg-[#A48FD6] cursor-pointer"
            aria-label="เพิ่มคำถาม"
          >
            <Plus size={32} strokeWidth={1.5} />
          </button>
        </main>
      </div>
    </Navbar>
  );
}
