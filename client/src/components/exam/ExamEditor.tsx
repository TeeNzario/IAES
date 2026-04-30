"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Trash2, Upload } from "lucide-react";
import ExamQuestionPickerModal from "@/components/exam/ExamQuestionPickerModal";
import {
  difficultyLabel,
  Question,
} from "@/components/questionBank/types";

/** Local-only shape for the datetime-local inputs. */
export interface ExamConfigDraft {
  title: string;
  description: string;
  start_time: string; // "yyyy-MM-ddTHH:mm" (local tz)
  end_time: string;
  show_results_immediately: boolean;
}

export function makeEmptyConfig(): ExamConfigDraft {
  return {
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    show_results_immediately: false,
  };
}

/**
 * Convert an ISO UTC string to "yyyy-MM-ddTHH:mm" in the user's local tz,
 * which is what `<input type="datetime-local">` expects.
 */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/**
 * Validation rules — mirror of the server-side rules so the bottom-right save
 * button can stay disabled until the draft is valid.
 *
 * Note: the "start_time >= now" rule is only enforced on CREATE, since editing
 * an exam whose start has already passed should still be allowed (you might
 * just be tweaking title / questions). The backend mirrors the relaxed rule on
 * update as well.
 */
export function validate(
  cfg: ExamConfigDraft,
  questions: Question[],
  opts: { mode: "create" | "edit" },
): string | null {
  if (!cfg.title.trim()) return "ต้องกรอกชื่อข้อสอบ";
  if (!cfg.start_time) return "ต้องกรอกเวลาเริ่ม";
  if (!cfg.end_time) return "ต้องกรอกเวลาสิ้นสุด";
  const start = new Date(cfg.start_time);
  const end = new Date(cfg.end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return "รูปแบบเวลาไม่ถูกต้อง";
  if (start >= end) return "เวลาเริ่มต้องก่อนเวลาสิ้นสุด";
  if (opts.mode === "create" && start.getTime() < Date.now() - 60_000)
    return "เวลาเริ่มต้องไม่ใช่เวลาในอดีต";
  if (questions.length < 1) return "ต้องเลือกคำถามอย่างน้อย 1 ข้อ";
  return null;
}

/**
 * Outgoing payload posted/patched to the server.
 */
export interface ExamSubmitPayload {
  title: string;
  description?: string;
  start_time: string; // ISO
  end_time: string;
  show_results_immediately: boolean;
  question_ids: string[];
}

interface Props {
  offeringId: string;
  mode: "create" | "edit";
  /** Initial state for hydration (edit page passes the loaded exam). */
  initialConfig?: ExamConfigDraft;
  initialQuestions?: Question[];
  /** Save handler: parent decides POST vs PATCH and where to redirect. */
  onSubmit: (payload: ExamSubmitPayload) => Promise<void>;
  /** Optional delete handler (only edit mode passes this). */
  onDelete?: () => Promise<void>;
}

/**
 * Shared editor used by both `/exam/create` and `/exams/[examId]/edit` pages.
 * Owns the entire UI and local form state; parent only owns the
 * create-vs-update decision and the optional delete flow.
 */
export default function ExamEditor({
  offeringId,
  mode,
  initialConfig,
  initialQuestions,
  onSubmit,
  onDelete,
}: Props) {
  const router = useRouter();

  const [config, setConfig] = useState<ExamConfigDraft>(
    initialConfig ?? makeEmptyConfig(),
  );
  const [selected, setSelected] = useState<Question[]>(initialQuestions ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete-confirmation modal (edit mode only).
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const validationError = validate(config, selected, { mode });
  const canSave = validationError === null && !saving;

  const handlePickerConfirm = (picks: Question[]) => {
    // Preserve the order of items the user kept; append newly added ones.
    const pickIds = new Set(picks.map((p) => p.question_id));
    const pickById = new Map(picks.map((p) => [p.question_id, p]));
    const kept: Question[] = [];
    selected.forEach((q) => {
      if (pickIds.has(q.question_id)) {
        kept.push(pickById.get(q.question_id) ?? q);
        pickById.delete(q.question_id);
      }
    });
    const appended = Array.from(pickById.values());
    setSelected([...kept, ...appended]);
    setPickerOpen(false);
  };

  const removeQuestion = (id: string) =>
    setSelected((prev) => prev.filter((q) => q.question_id !== id));

  const handleSave = async () => {
    if (!canSave) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: config.title.trim(),
        description: config.description.trim() || undefined,
        start_time: new Date(config.start_time).toISOString(),
        end_time: new Date(config.end_time).toISOString(),
        show_results_immediately: config.show_results_immediately,
        question_ids: selected.map((q) => q.question_id),
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? "บันทึกไม่สำเร็จ";
      setError(Array.isArray(msg) ? msg.join("; ") : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? "ลบไม่สำเร็จ";
      setError(Array.isArray(msg) ? msg.join("; ") : msg);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push(`/course/${offeringId}`)}
            className="flex items-center gap-1 rounded-md border border-[#B7A3E3] bg-white px-4 py-1.5 text-sm font-light text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
          >
            <ChevronLeft size={14} /> ย้อนกลับ
          </button>

          <div className="flex items-center gap-2">
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 rounded-md border border-rose-400 bg-white px-4 py-1.5 text-sm font-light text-rose-500 hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 size={14} /> ลบชุดข้อสอบ
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              aria-disabled={!canSave}
              title={!canSave && validationError ? validationError : undefined}
              className={`rounded-md px-5 py-1.5 text-sm text-white ${
                canSave
                  ? "bg-[#B7A3E3] hover:bg-[#A48FD6] cursor-pointer"
                  : "bg-[#B7A3E3] opacity-50 cursor-not-allowed"
              }`}
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>

        {/* Heading card with title + description */}
        <div className="relative">
          <div className="rounded-2xl bg-[#B7A3E3] px-7 py-7 text-white shadow-sm">
            <input
              type="text"
              value={config.title}
              onChange={(e) =>
                setConfig({ ...config, title: e.target.value })
              }
              placeholder="สร้างชุดข้อสอบ"
              className="w-full bg-transparent text-2xl font-light placeholder-white/70 outline-none"
            />
            <input
              type="text"
              value={config.description}
              onChange={(e) =>
                setConfig({ ...config, description: e.target.value })
              }
              placeholder="คำอธิบายแหล่งข้อสอบ"
              className="mt-1 w-full bg-transparent text-sm font-light placeholder-white/70 outline-none"
            />
          </div>

          {/* Side rail */}
          <div className="absolute -right-14 top-2 hidden flex-col gap-2 lg:flex">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
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

        {/* Config — time + show results */}
        <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-light text-[#575757]">
              เริ่มสอบ
            </label>
            <input
              type="datetime-local"
              value={config.start_time}
              onChange={(e) =>
                setConfig({ ...config, start_time: e.target.value })
              }
              className="w-full rounded-md bg-[#F4EFFF] px-3 py-1.5 text-sm font-light text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-light text-[#575757]">
              สิ้นสุดสอบ
            </label>
            <input
              type="datetime-local"
              value={config.end_time}
              onChange={(e) =>
                setConfig({ ...config, end_time: e.target.value })
              }
              className="w-full rounded-md bg-[#F4EFFF] px-3 py-1.5 text-sm font-light text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3]"
            />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-light text-[#575757]">
              <input
                type="checkbox"
                checked={config.show_results_immediately}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    show_results_immediately: e.target.checked,
                  })
                }
                className="accent-[#B7A3E3]"
              />
              แสดงผลทันทีหลังสอบ
            </label>
          </div>
        </div>

        {/* Selected questions preview */}
        <div className="mt-5 space-y-4">
          {selected.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center text-sm font-light text-gray-400 shadow-sm">
              ยังไม่ได้เลือกคำถาม — กดปุ่ม + ทางขวาเพื่อเลือก
            </div>
          ) : (
            selected.map((q, i) => (
              <QuestionPreviewCard
                key={q.question_id}
                index={i}
                question={q}
                onRemove={() => removeQuestion(q.question_id)}
              />
            ))
          )}
        </div>

        {/* Big "+" bottom button */}
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#B7A3E3] py-6 text-white shadow-sm hover:bg-[#A48FD6] cursor-pointer"
            aria-label="เพิ่มคำถาม"
          >
            <Plus size={28} strokeWidth={1.5} />
          </button>
        )}
      </main>

      {pickerOpen && (
        <ExamQuestionPickerModal
          offeringId={offeringId}
          initialSelected={selected}
          onCancel={() => setPickerOpen(false)}
          onConfirm={handlePickerConfirm}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-medium text-[#575757]">
              ยืนยันการลบ
            </h3>
            <p className="mb-5 text-sm font-light text-[#575757]">
              คุณแน่ใจหรือไม่ว่าต้องการลบชุดข้อสอบนี้?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-[#B7A3E3] px-5 py-1.5 text-sm text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirmed}
                className="rounded-md bg-rose-500 px-5 py-1.5 text-sm text-white hover:bg-rose-600 cursor-pointer disabled:opacity-50"
              >
                {deleting ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuestionPreviewCard({
  index,
  question,
  onRemove,
}: {
  index: number;
  question: Question;
  onRemove: () => void;
}) {
  const diff = difficultyLabel(question.difficulty_param);
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-sm font-medium text-[#575757]">
          {index + 1}. {question.question_text}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#B7A3E3] text-white hover:bg-[#A48FD6] cursor-pointer"
          aria-label="ลบ"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <ul className="mb-3 space-y-1">
        {question.choices?.map((c, i) => (
          <li
            key={c.choice_id ?? i}
            className="flex items-center gap-2 text-sm font-light text-[#575757]"
          >
            <input
              type="radio"
              disabled
              checked={c.is_correct}
              readOnly
              className="accent-[#B7A3E3]"
            />
            <span className={c.is_correct ? "font-medium" : ""}>
              {c.choice_text}
            </span>
          </li>
        ))}
      </ul>

      <div className="mb-2 grid grid-cols-3 gap-3 text-xs font-light text-[#575757]">
        <ReadOnly label="ความยาก" value={question.difficulty_param} />
        <ReadOnly label="อำนาจการจำแนก" value={question.discrimination_param} />
        <ReadOnly label="โอกาสการเดา" value={question.guessing_param} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] ${diff.className}`}
        >
          {diff.label}
        </span>
        {question.knowledge_categories?.map((t) => (
          <span
            key={t.knowledge_category_id}
            className="rounded-full bg-[#B7A3E3] px-2.5 py-0.5 text-[11px] text-white"
          >
            {t.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReadOnly({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-gray-400">{label}</label>
      <div className="rounded-md bg-[#F4EFFF] px-3 py-1.5 text-sm text-[#575757]">
        {value ?? "-"}
      </div>
    </div>
  );
}
