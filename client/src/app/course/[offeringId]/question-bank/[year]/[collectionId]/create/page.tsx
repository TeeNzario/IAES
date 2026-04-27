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

interface CollectionInfo {
  question_collection_id: string;
  title: string;
  description: string | null;
}

export default function CreateQuestionsPage() {
  const router = useRouter();
  const { offeringId, year, collectionId } = useParams<{
    offeringId: string;
    year: string;
    collectionId: string;
  }>();

  const [collection, setCollection] = useState<CollectionInfo | null>(null);
  const [tags, setTags] = useState<KnowledgeTag[]>([]);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([makeEmptyDraft()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInit = useCallback(async () => {
    if (!offeringId || !collectionId) return;
    try {
      const [col, tagList] = await Promise.all([
        apiFetch<CollectionInfo>(
          `/course-offerings/${offeringId}/question-bank/collections/${collectionId}`,
        ),
        apiFetch<KnowledgeTag[]>(
          `/course-offerings/${offeringId}/knowledge-categories`,
        ),
      ]);
      setCollection(col);
      setTags(tagList);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "โหลดข้อมูลไม่สำเร็จ";
      setError(msg);
    }
  }, [offeringId, collectionId]);

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

  /** Find first failing draft index + reason, or null if all valid. */
  const validate = (): string | null => {
    for (const [i, d] of drafts.entries()) {
      if (!isDraftValid(d)) {
        return `คำถามข้อ ${i + 1}: ข้อมูลยังไม่ครบถ้วน`;
      }
    }
    return null;
  };

  const allValid = drafts.every(isDraftValid);

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    try {
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
      router.push(
        `/course/${offeringId}/question-bank/${year}/${collectionId}`,
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "บันทึกไม่สำเร็จ";
      setError(Array.isArray(msg) ? msg.join("; ") : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Top bar with back + save */}
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/course/${offeringId}/question-bank/${year}/${collectionId}`,
                )
              }
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

          {/* Heading card */}
          <div className="relative">
            <div className="rounded-2xl bg-[#B7A3E3] px-7 py-7 text-white shadow-sm">
              <h1 className="text-2xl font-light">สร้างคำถาม</h1>
              <p className="mt-1 text-sm font-light opacity-90">
                {collection?.title
                  ? `${collection.title}${
                      collection.description ? ` — ${collection.description}` : ""
                    }`
                  : "คำอธิบายของข้อสอบ"}
              </p>
            </div>

            {/* Floating side toolbar (matches the mock's right rail) */}
            <div className="absolute right-[-56px] top-2 hidden flex-col gap-2 lg:flex">
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
                title="อัปโหลด (เร็วๆ นี้)"
                className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#B7A3E3] shadow-sm opacity-60"
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

          {/* Question cards */}
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

          {/* Big "+" add button at the bottom */}
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
