"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Inbox } from "lucide-react";
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
import { getCurrentAcademicSettings } from "@/features/academicSettings/academicSettings.api";

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
  const settings = await getCurrentAcademicSettings();
  let yearRow =
    years.find((year) => year.academic_year === settings.academic_year) ?? null;
  if (!yearRow) {
    yearRow = await apiFetch<Year>(
      `/course-offerings/${offeringId}/question-bank/years`,
      { method: "POST", data: { academic_year: settings.academic_year } },
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
  const [saved, setSaved] = useState(false);
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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/exam-bank/${offeringId}/questions`)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#514667] transition-colors hover:bg-white cursor-pointer"
              aria-label="กลับ"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-[#2F2A3A] sm:text-xl">
                <Inbox size={22} className="text-[#7C5BD9]" />
                สร้างคำถาม
              </h1>
              <p className="mt-1 text-sm font-normal text-[#7A7287]">
                เพิ่มคำถามใหม่เข้าคลังคำถามของรายวิชานี้
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
              บันทึกสำเร็จ
            </p>
          )}

          <div className="space-y-5">
            <QuestionEditorCard
              key={draft.draft_id}
              index={0}
              draft={draft}
              tags={tags}
              fixedChoiceCount={FIXED_CHOICE_COUNT}
              difficultyOptions={DIFFICULTY_LEVEL_CONFIG}
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
