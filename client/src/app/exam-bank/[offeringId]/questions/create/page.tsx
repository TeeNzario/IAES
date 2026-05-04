"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import QuestionEditorCard, {
  DraftQuestion,
  makeEmptyDraft,
} from "@/components/questionBank/QuestionEditorCard";
import {
  DIFFICULTY_LEVEL_CONFIG,
  FIXED_CHOICE_COUNT,
} from "@/components/questionBank/questionEditorConfig";
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
    const currentYear = new Date().getFullYear() + 543;
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
  const [draft, setDraft] = useState<DraftQuestion>(makeEmptyDraft());
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

  const handleConfirmDraft = async (confirmedDraft: DraftQuestion) => {
    setError(null);
    setSaving(true);
    try {
      const collectionId = await resolveDefaultCollectionId(offeringId);
      await apiFetch(
        `/course-offerings/${offeringId}/question-bank/collections/${collectionId}/questions/bulk`,
        {
          method: "POST",
          data: {
            questions: [
              {
                question_text: confirmedDraft.question_text.trim(),
                question_type: "MCQ_SINGLE",
                choices: confirmedDraft.choices.map((c, idx) => ({
                  choice_text: c.choice_text.trim(),
                  is_correct: c.is_correct,
                  display_order: idx,
                })),
                difficulty_param: Number(confirmedDraft.difficulty_param),
                discrimination_param: Number(
                  confirmedDraft.discrimination_param,
                ),
                guessing_param: Number(confirmedDraft.guessing_param),
                knowledge_category_ids: confirmedDraft.knowledge_category_ids,
              },
            ],
          },
        },
      );
      setDraft(makeEmptyDraft());
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
          </div>

          <div className="relative">
            <div className="rounded-2xl bg-[#B7A3E3] px-7 py-7 text-white shadow-sm">
              <h1 className="text-2xl font-light">สร้างคำถาม</h1>
              <p className="mt-1 text-sm font-light opacity-90">
                เพิ่มคำถามใหม่เข้าคลังคำถามของรายวิชานี้
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-5 space-y-5">
            <QuestionEditorCard
              key={draft.draft_id}
              index={0}
              draft={draft}
              tags={tags}
              fixedChoiceCount={FIXED_CHOICE_COUNT}
              difficultyOptions={DIFFICULTY_LEVEL_CONFIG}
              knowledgeDisplayMode="list"
              saving={saving}
              onChange={setDraft}
              onConfirm={handleConfirmDraft}
              onDelete={() => setDraft(makeEmptyDraft())}
            />
          </div>
        </main>
      </div>
    </Navbar>
  );
}
