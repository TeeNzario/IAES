"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  ChevronLeft,
  ClipboardList,
  FileText,
  Filter,
  ListChecks,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import ExamQuestionPickerModal from "@/components/exam/ExamQuestionPickerModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  dateOnlyMs,
  parseDateTimeLocalInput,
} from "@/lib/examScheduleValidation";
import { FIELD_LIMITS, maxLengthMessage } from "@/config/fieldLimits";
import { difficultyLabel, Question } from "@/components/questionBank/types";
import {
  FIXED_GUESSING_PARAM,
  QUESTION_PARAM_LIMITS,
} from "@/config/questionParamLimits";

/** Local-only shape for the datetime-local inputs. */
export interface ExamConfigDraft {
  title: string;
  description: string;
  start_time: string; // "yyyy-MM-ddTHH:mm" (local tz)
  end_time: string;
}

export function makeEmptyConfig(): ExamConfigDraft {
  return {
    title: "",
    description: "",
    start_time: "",
    end_time: "",
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

const dateTimeFormatMessage = (part?: "date" | "time") =>
  part === "time" ? "รูปแบบเวลาไม่ถูกต้อง" : "รูปแบบวันที่ไม่ถูกต้อง";

const dateTimeLocalToIso = (value: string) => {
  const result = parseDateTimeLocalInput(value);
  if (!result.date) throw new Error("Invalid local date/time");
  return result.date.toISOString();
};

const EXAM_TITLE_MAX_LENGTH = FIELD_LIMITS.examTitle;
const EXAM_DESCRIPTION_MAX_LENGTH = FIELD_LIMITS.examDescription;
const MIN_ADAPTIVE_QUESTIONS = 8;
type QuestionDifficultyFilter = "easy" | "medium" | "hard";

const QUESTION_DIFFICULTY_LABELS: Record<QuestionDifficultyFilter, string> = {
  easy: "ง่าย",
  medium: "กลาง",
  hard: "ยาก",
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasValidAdaptiveIrtParams(question: Question): boolean {
  const { difficulty, discrimination } = QUESTION_PARAM_LIMITS;
  return (
    isFiniteNumber(question.difficulty_param) &&
    question.difficulty_param >= difficulty.min &&
    question.difficulty_param <= difficulty.max &&
    isFiniteNumber(question.discrimination_param) &&
    question.discrimination_param >= discrimination.min &&
    question.discrimination_param <= discrimination.max &&
    isFiniteNumber(question.guessing_param) &&
    Math.abs(question.guessing_param - FIXED_GUESSING_PARAM) <= Number.EPSILON
  );
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
  opts: { mode: "create" | "edit"; hideSchedule?: boolean },
): string | null {
  if (!cfg.title.trim()) return "ต้องกรอกชื่อข้อสอบ";
  if (cfg.title.trim().length > EXAM_TITLE_MAX_LENGTH) {
    return maxLengthMessage("ชื่อชุดข้อสอบ", EXAM_TITLE_MAX_LENGTH);
  }
  if (cfg.description.trim().length > EXAM_DESCRIPTION_MAX_LENGTH) {
    return maxLengthMessage("คำอธิบายชุดข้อสอบ", EXAM_DESCRIPTION_MAX_LENGTH);
  }
  if (!opts.hideSchedule) {
    if (!cfg.start_time) return "ต้องกรอกเวลาเริ่ม";
    if (!cfg.end_time) return "ต้องกรอกเวลาสิ้นสุด";
    const startResult = parseDateTimeLocalInput(cfg.start_time);
    const endResult = parseDateTimeLocalInput(cfg.end_time);
    if (!startResult.date) {
      return dateTimeFormatMessage(startResult.invalidPart);
    }
    if (!endResult.date) {
      return dateTimeFormatMessage(endResult.invalidPart);
    }
    const start = startResult.date;
    const end = endResult.date;
    if (dateOnlyMs(end) < dateOnlyMs(start)) {
      return "วันสิ้นสุดสอบต้องไม่อยู่ก่อนวันเริ่มสอบ";
    }
    if (start >= end) return "เวลาสิ้นสุดสอบต้องอยู่หลังเวลาเริ่มสอบ";
    if (opts.mode === "create" && start.getTime() < Date.now() - 60_000) {
      const now = new Date();
      if (dateOnlyMs(start) < dateOnlyMs(now)) {
        return "วันเริ่มสอบต้องไม่ใช่วันในอดีต";
      }
      return "เวลาเริ่มสอบต้องไม่ใช่เวลาในอดีต";
    }
  }
  if (questions.length < MIN_ADAPTIVE_QUESTIONS) {
    return `ต้องเลือกคำถามอย่างน้อย ${MIN_ADAPTIVE_QUESTIONS} ข้อสำหรับ adaptive IRT`;
  }
  const invalidIrtQuestionIndex = questions.findIndex(
    (question) => !hasValidAdaptiveIrtParams(question),
  );
  if (invalidIrtQuestionIndex !== -1) {
    return `คำถามข้อ ${invalidIrtQuestionIndex + 1} มีค่า IRT ไม่ครบหรือไม่ตรงสูตร`;
  }
  const untaggedQuestionIndex = questions.findIndex(
    (question) => (question.knowledge_categories ?? []).length < 1,
  );
  if (untaggedQuestionIndex !== -1) {
    return `คำถามข้อ ${untaggedQuestionIndex + 1} ต้องมีหมวดหมู่ความรู้`;
  }
  const invalidChoicesQuestionIndex = questions.findIndex((question) => {
    const choices = question.choices ?? [];
    const correctCount = choices.filter((choice) => choice.is_correct).length;
    const correctEnough =
      question.question_type === "MCQ_MULTI"
        ? correctCount >= 1
        : correctCount === 1;
    return choices.length < 2 || !correctEnough;
  });
  if (invalidChoicesQuestionIndex !== -1) {
    return `คำถามข้อ ${invalidChoicesQuestionIndex + 1} ต้องมีตัวเลือกอย่างน้อย 2 ข้อและคำตอบถูกตามชนิดคำถาม`;
  }
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
  question_ids: string[];
}

interface Props {
  offeringId: string;
  mode: "create" | "edit";
  /** Initial state for hydration (edit page passes the loaded exam). */
  initialConfig?: ExamConfigDraft;
  initialQuestions?: Question[];
  /**
   * When true, hides the schedule (start_time / end_time) UI and skips
   * its validation. Used by the exam-bank "create exam set" flow where
   * scheduling is deferred to the "เปิดการสอบ" page. Placeholder dates
   * are sent on submit so the backend POST stays valid.
   */
  hideSchedule?: boolean;
  /** Optional override for the "back" button target. Defaults to course page. */
  backHref?: string;
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
  hideSchedule = false,
  backHref,
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
  const [questionDifficultyFilter, setQuestionDifficultyFilter] =
    useState<QuestionDifficultyFilter | null>(null);

  // Delete-confirmation modal (edit mode only).
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const validationError = validate(config, selected, { mode, hideSchedule });
  const canSave = validationError === null && !saving;

  // Real-time date-field errors (independent from "save-disabled" reason).
  const dateErrors = useMemo(() => {
    const out: { start?: string; end?: string } = {};
    if (hideSchedule) return out;
    if (!config.start_time) {
      out.start = "กรุณาเลือกวันและเวลาเริ่มสอบ";
    } else {
      const startResult = parseDateTimeLocalInput(config.start_time);
      const s = startResult.date;
      if (!s) {
        out.start = dateTimeFormatMessage(startResult.invalidPart);
      } else if (mode === "create" && s.getTime() < Date.now() - 60_000) {
        const now = new Date();
        out.start =
          dateOnlyMs(s) < dateOnlyMs(now)
            ? "วันเริ่มสอบต้องไม่ใช่วันในอดีต"
            : "เวลาเริ่มสอบต้องไม่ใช่เวลาในอดีต";
      }
    }
    if (!config.end_time) {
      out.end = "กรุณาเลือกวันและเวลาสิ้นสุด";
    } else {
      const endResult = parseDateTimeLocalInput(config.end_time);
      const e = endResult.date;
      if (!e) {
        out.end = dateTimeFormatMessage(endResult.invalidPart);
      } else if (config.start_time) {
        const s = parseDateTimeLocalInput(config.start_time).date;
        if (s) {
          if (dateOnlyMs(e) < dateOnlyMs(s)) {
            out.end = "วันสิ้นสุดสอบต้องไม่อยู่ก่อนวันเริ่มสอบ";
          } else if (s >= e) {
            out.end = "เวลาสิ้นสุดสอบต้องอยู่หลังเวลาเริ่มสอบ";
          }
        }
      }
    }
    return out;
  }, [config.start_time, config.end_time, mode, hideSchedule]);

  const stats = useMemo(() => buildExamStats(selected), [selected]);

  const visibleSelected = useMemo(
    () =>
      selected
        .map((question, index) => ({ question, index }))
        .filter(({ question }) => {
          if (!questionDifficultyFilter) return true;
          return (
            getQuestionDifficultyFilter(question) === questionDifficultyFilter
          );
        }),
    [selected, questionDifficultyFilter],
  );

  const visibleStats = useMemo(
    () => buildExamStats(visibleSelected.map(({ question }) => question)),
    [visibleSelected],
  );

  const toggleQuestionDifficultyFilter = (next: QuestionDifficultyFilter) => {
    setQuestionDifficultyFilter((current) => (current === next ? null : next));
  };

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
      // When the schedule UI is hidden (exam-bank "set" creation flow),
      // we still need ISO dates for the backend. Use a far-future placeholder
      // so the row stays UPCOMING until the instructor schedules it via the
      // "เปิดการสอบ" page.
      const PLACEHOLDER_START = () => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 10);
        return d.toISOString();
      };
      const PLACEHOLDER_END = () => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 10);
        d.setHours(d.getHours() + 2);
        return d.toISOString();
      };
      const startIso =
        hideSchedule && !config.start_time
          ? PLACEHOLDER_START()
          : dateTimeLocalToIso(config.start_time);
      const endIso =
        hideSchedule && !config.end_time
          ? PLACEHOLDER_END()
          : dateTimeLocalToIso(config.end_time);
      await onSubmit({
        title: config.title.trim(),
        description: config.description.trim() || undefined,
        start_time: startIso,
        end_time: endIso,
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
      setDeleting(false);
      setConfirmDelete(false);
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
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="mb-4 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(backHref ?? `/course/${offeringId}`)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#514667] ring-1 ring-transparent transition-colors hover:bg-[#FAF8FF] hover:ring-[#E7DDF8] cursor-pointer"
              aria-label="ย้อนกลับ"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-[#2F2A3A] sm:text-2xl">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                  <ClipboardList size={22} />
                </span>
                {mode === "edit" ? "แก้ไขชุดข้อสอบ" : "สร้างชุดข้อสอบ"}
              </h1>
              <p className="mt-1 text-sm font-normal text-[#7A7287]">
                กำหนดรายละเอียดชุดข้อสอบและเลือกคำถามสำหรับรายวิชานี้
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-500 shadow-sm transition-colors hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 size={16} /> ลบชุดข้อสอบ
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              aria-disabled={!canSave}
              title={!canSave && validationError ? validationError : undefined}
              className={`h-11 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-colors ${
                canSave
                  ? "bg-[#B7A3E3] hover:bg-[#A48FD6] cursor-pointer"
                  : "bg-[#B7A3E3] opacity-50 cursor-not-allowed"
              }`}
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            <AlertCircle size={14} />
            {error}
          </p>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
          <div className="mb-5">
            <h2 className="flex items-center gap-2.5 text-base font-semibold text-[#2F2A3A]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4EFFF] text-[#7C5BD9]">
                <FileText size={18} />
              </span>
              ข้อมูลชุดข้อสอบ
            </h2>
            <p className="mt-1 text-sm font-normal text-[#7A7287]">
              ชื่อและคำอธิบายนี้จะแสดงในหน้าคลังชุดข้อสอบ
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <label className="block lg:col-span-5">
              <span className="mb-1.5 block text-[15px] font-semibold text-[#514667]">
                ชื่อชุดข้อสอบ
              </span>
              <input
                type="text"
                value={config.title}
                maxLength={EXAM_TITLE_MAX_LENGTH}
                onChange={(e) =>
                  setConfig({ ...config, title: e.target.value })
                }
                placeholder="สร้างชุดข้อสอบ"
                className="h-12 w-full rounded-xl bg-[#FAF8FF] px-4 text-[15px] font-medium text-[#2F2A3A] placeholder:text-[#B7AFC6] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
              />
              <span className="mt-1 block text-right text-xs font-medium text-[#7A7287]">
                {config.title.length}/{EXAM_TITLE_MAX_LENGTH}
              </span>
            </label>
            <label className="block lg:col-span-7">
              <span className="mb-1.5 block text-[15px] font-semibold text-[#514667]">
                คำอธิบาย
              </span>
              <textarea
                value={config.description}
                maxLength={EXAM_DESCRIPTION_MAX_LENGTH}
                onChange={(e) =>
                  setConfig({ ...config, description: e.target.value })
                }
                placeholder="เช่น REST API, Database, Security"
                className="min-h-28 max-h-56 w-full resize-y rounded-xl bg-[#FAF8FF] px-4 py-3 text-[15px] font-medium leading-relaxed text-[#2F2A3A] placeholder:text-[#B7AFC6] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
              />
              <span className="mt-1 block text-right text-xs font-medium text-[#7A7287]">
                {config.description.length}/{EXAM_DESCRIPTION_MAX_LENGTH}
              </span>
            </label>
          </div>
        </section>

        {/* Config — schedule (hidden in set-creation flow) */}
        {!hideSchedule && (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="mb-5">
              <h2 className="flex items-center gap-2.5 text-base font-semibold text-[#2F2A3A]">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4EFFF] text-[#7C5BD9]">
                  <ClipboardList size={18} />
                </span>
                ตั้งเวลาเปิด-ปิดสอบ
              </h2>
              <p className="mt-1 text-sm font-normal text-[#7A7287]">
                กำหนดช่วงเวลาที่นักศึกษาสามารถเข้าทำข้อสอบได้
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[#FAF8FF] p-5 ring-1 ring-[#EFE8FB]">
                <label className="block">
                  <span className="mb-1.5 block text-[15px] font-semibold text-[#514667]">
                    เริ่มสอบ
                  </span>
                  <input
                    type="datetime-local"
                    value={config.start_time}
                    onChange={(e) =>
                      setConfig({ ...config, start_time: e.target.value })
                    }
                    className={`h-11 w-full rounded-xl bg-white px-4 text-[15px] font-medium text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 ${
                      dateErrors.start
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {dateErrors.start && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-rose-500">
                      <AlertCircle size={12} />
                      {dateErrors.start}
                    </p>
                  )}
                </label>
              </div>
              <div className="rounded-2xl bg-[#FAF8FF] p-5 ring-1 ring-[#EFE8FB]">
                <label className="block">
                  <span className="mb-1.5 block text-[15px] font-semibold text-[#514667]">
                    สิ้นสุดสอบ
                  </span>
                  <input
                    type="datetime-local"
                    value={config.end_time}
                    onChange={(e) =>
                      setConfig({ ...config, end_time: e.target.value })
                    }
                    className={`h-11 w-full rounded-xl bg-white px-4 text-[15px] font-medium text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 ${
                      dateErrors.end
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {dateErrors.end && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-rose-500">
                      <AlertCircle size={12} />
                      {dateErrors.end}
                    </p>
                  )}
                </label>
              </div>
            </div>
          </section>
        )}

        {/* Stats panel — overview of currently selected questions */}
        <ExamStatsPanel
          stats={questionDifficultyFilter ? visibleStats : stats}
          allStats={stats}
          activeDifficultyFilter={questionDifficultyFilter}
          onDifficultyFilterChange={toggleQuestionDifficultyFilter}
        />

        {/* Selected questions preview */}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2.5 text-base font-semibold text-[#2F2A3A]">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4EFFF] text-[#7C5BD9]">
                  <ListChecks size={18} />
                </span>
                คำถามในชุดข้อสอบ
                <span className="ml-1 rounded-full bg-[#F4EFFF] px-2.5 py-1 text-sm font-semibold text-[#7C5BD9]">
                  {questionDifficultyFilter
                    ? `${visibleSelected.length}/${selected.length}`
                    : selected.length}
                </span>
              </h2>
              <p className="mt-1 text-sm font-normal text-[#7A7287]">
                {questionDifficultyFilter
                  ? `กำลังแสดงคำถามระดับ${
                      QUESTION_DIFFICULTY_LABELS[questionDifficultyFilter]
                    }`
                  : "จัดลำดับคำถามตามลำดับที่เลือกไว้ในชุดข้อสอบ"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex h-10 items-center gap-2 rounded-xl bg-[#B7A3E3] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] cursor-pointer"
              >
                <Plus size={16} />
                เพิ่มคำถาม
              </button>
            </div>
          </div>

          {selected.length === 0 ? (
            <div className="rounded-2xl bg-[#FAF8FF] p-10 text-center text-sm font-medium text-[#7A7287] ring-1 ring-[#EFE8FB]">
              ยังไม่ได้เลือกคำถาม
            </div>
          ) : visibleSelected.length === 0 ? (
            <div className="rounded-2xl bg-[#FAF8FF] p-8 text-center ring-1 ring-[#EFE8FB]">
              <p className="text-sm font-semibold text-[#514667]">
                ไม่มีคำถามระดับ
                {questionDifficultyFilter
                  ? QUESTION_DIFFICULTY_LABELS[questionDifficultyFilter]
                  : ""}
              </p>
              <button
                type="button"
                onClick={() => setQuestionDifficultyFilter(null)}
                className="mt-3 inline-flex h-9 items-center rounded-xl bg-white px-4 text-sm font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSelected.map(({ question, index }) => (
                <QuestionPreviewCard
                  key={question.question_id}
                  index={index}
                  question={question}
                  onRemove={() => removeQuestion(question.question_id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {pickerOpen && (
        <ExamQuestionPickerModal
          offeringId={offeringId}
          initialSelected={selected}
          onCancel={() => setPickerOpen(false)}
          onConfirm={handlePickerConfirm}
        />
      )}

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        onConfirm={handleDeleteConfirmed}
        title="ลบชุดข้อสอบ"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบชุดข้อสอบนี้?"
        confirmText="ลบ"
        cancelText="ยกเลิก"
        isLoading={deleting}
        variant="danger"
      />
    </>
  );
}

function formatQuestionParam(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function getQuestionDifficultyFilter(
  question: Question,
): QuestionDifficultyFilter | null {
  const difficulty = question.difficulty_param;
  if (typeof difficulty !== "number" || !Number.isFinite(difficulty)) {
    return null;
  }
  if (difficulty <= -0.5) return "easy";
  if (difficulty >= 0.5) return "hard";
  return "medium";
}

function buildExamStats(questions: Question[]): ExamStats {
  const total = questions.length;
  let easy = 0;
  let medium = 0;
  let hard = 0;
  let untagged = 0;
  let diffSum = 0;
  let diffCount = 0;
  let discriminationSum = 0;
  let discriminationCount = 0;
  let guessingSum = 0;
  let guessingCount = 0;
  const byCategory = new Map<string, { name: string; count: number }>();

  for (const question of questions) {
    const difficulty = question.difficulty_param;
    if (typeof difficulty === "number" && Number.isFinite(difficulty)) {
      diffSum += difficulty;
      diffCount += 1;
      if (difficulty < 0) easy += 1;
      else if (difficulty === 0) medium += 1;
      else hard += 1;
    } else {
      untagged += 1;
    }

    const discrimination = question.discrimination_param;
    if (typeof discrimination === "number" && Number.isFinite(discrimination)) {
      discriminationSum += discrimination;
      discriminationCount += 1;
    }

    const guessing = question.guessing_param;
    if (typeof guessing === "number" && Number.isFinite(guessing)) {
      guessingSum += guessing;
      guessingCount += 1;
    }

    for (const category of question.knowledge_categories ?? []) {
      const current = byCategory.get(category.knowledge_category_id);
      if (current) current.count += 1;
      else {
        byCategory.set(category.knowledge_category_id, {
          name: category.name,
          count: 1,
        });
      }
    }
  }

  return {
    total,
    easy,
    medium,
    hard,
    untagged,
    avgDifficulty: diffCount > 0 ? diffSum / diffCount : null,
    avgDiscrimination:
      discriminationCount > 0 ? discriminationSum / discriminationCount : null,
    avgGuessing: guessingCount > 0 ? guessingSum / guessingCount : null,
    categories: Array.from(byCategory.values()).sort(
      (a, b) => b.count - a.count,
    ),
  };
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
  const categories = question.knowledge_categories ?? [];
  const parameters = [
    { label: "b", value: question.difficulty_param, title: "ความยาก" },
    {
      label: "a",
      value: question.discrimination_param,
      title: "อำนาจการจำแนก",
    },
    { label: "c", value: question.guessing_param, title: "โอกาสการเดา" },
  ];

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
      <div className="flex items-start justify-between gap-4 border-b border-[#EFE8FB] bg-[#FAF8FF] px-4 py-3.5">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#F4EFFF] text-sm font-semibold text-[#7C5BD9]">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-relaxed text-[#2F2A3A]">
              {question.question_text}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex h-7 items-center rounded-full px-3 text-sm font-semibold ${diff.className}`}
              >
                {diff.label}
              </span>
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold text-[#514667] ring-1 ring-[#E7DDF8]">
                <Tags size={14} className="text-[#7C5BD9]" />
                {categories.length} หมวดหมู่
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-rose-500 ring-1 ring-rose-100 transition-colors hover:bg-rose-50 cursor-pointer"
          aria-label="ลบ"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="mb-2 text-sm font-semibold text-[#514667]">
            ตัวเลือกคำตอบ
          </p>
          <ul className="grid gap-2 md:grid-cols-2">
            {question.choices?.map((c, i) => (
              <li
                key={c.choice_id ?? i}
                className={`flex min-h-10 items-start gap-2 rounded-xl px-3 py-2 text-sm ring-1 ${
                  c.is_correct
                    ? "bg-emerald-50 font-semibold text-emerald-800 ring-emerald-100"
                    : "bg-[#FAF8FF] font-medium text-[#514667] ring-[#EFE8FB]"
                }`}
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    c.is_correct ? "bg-emerald-500" : "bg-[#D7D2DE]"
                  }`}
                />
                <span className="leading-relaxed">{c.choice_text}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#EFE8FB]">
          <p className="mb-2 text-sm font-semibold text-[#514667]">
            พารามิเตอร์
          </p>
          <div className="grid grid-cols-3 gap-2">
            {parameters.map((item) => (
              <div
                key={item.label}
                title={item.title}
                className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-[#E7DDF8]"
              >
                <div className="text-xs font-semibold text-[#7C5BD9]">
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#2F2A3A]">
                  {formatQuestionParam(item.value)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-[#514667]">
              หมวดหมู่ความรู้
            </p>
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((t) => (
                  <span
                    key={t.knowledge_category_id}
                    className="inline-flex max-w-full items-center rounded-xl bg-white px-3 py-1.5 text-sm font-semibold leading-relaxed text-[#514667] ring-1 ring-[#E7DDF8]"
                    title={t.name}
                  >
                    <span className="whitespace-normal break-words">
                      {t.name}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-[#B7AFC6]">
                ไม่มีหมวดหมู่
              </p>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

interface ExamStats {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  untagged: number;
  avgDifficulty: number | null;
  avgDiscrimination: number | null;
  avgGuessing: number | null;
  categories: { name: string; count: number }[];
}

function ExamStatsPanel({
  stats,
  allStats,
  activeDifficultyFilter,
  onDifficultyFilterChange,
}: {
  stats: ExamStats;
  allStats: ExamStats;
  activeDifficultyFilter: QuestionDifficultyFilter | null;
  onDifficultyFilterChange: (filter: QuestionDifficultyFilter) => void;
}) {
  const { total, avgDifficulty, avgDiscrimination, avgGuessing, categories } =
    stats;

  if (allStats.total === 0) return null;

  const distributionPct = (n: number) =>
    allStats.total > 0 ? Math.round((n / allStats.total) * 100) : 0;
  const allPct = (n: number) =>
    allStats.total > 0 ? Math.round((n / allStats.total) * 100) : 0;
  const categoryPct = (n: number) =>
    total > 0 ? Math.min(100, Math.round((n / total) * 100)) : 0;
  const activeFilterLabel = activeDifficultyFilter
    ? QUESTION_DIFFICULTY_LABELS[activeDifficultyFilter]
    : null;

  return (
    <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE8FB] px-5 py-4 sm:px-6">
        <h3 className="flex items-center gap-2.5 text-base font-semibold text-[#2F2A3A]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4EFFF] text-[#7C5BD9]">
            <BarChart3 size={18} />
          </span>
          <span>สถิติชุดข้อสอบ</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#F4EFFF] px-3 py-1 text-sm font-semibold text-[#7C5BD9]">
            {activeDifficultyFilter
              ? `แสดง ${total} จาก ${allStats.total} ข้อ`
              : `ทั้งหมด ${allStats.total} ข้อ`}
          </span>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FAF8FF] px-4 py-3 text-sm font-semibold text-[#514667] ring-1 ring-[#EFE8FB]">
            <span className="inline-flex items-center gap-2">
              <Filter size={15} className="text-[#7C5BD9]" />
              ตัวกรองระดับความยาก
            </span>
            {activeFilterLabel && (
              <button
                type="button"
                onClick={() => {
                  if (activeDifficultyFilter) {
                    onDifficultyFilterChange(activeDifficultyFilter);
                  }
                }}
                className="inline-flex h-9 items-center rounded-lg bg-white px-3.5 text-sm font-semibold text-[#7C5BD9] ring-1 ring-[#D9C9F4] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="ง่าย"
              value={allStats.easy}
              sub={`${allPct(allStats.easy)}%`}
              tone="emerald"
              active={activeDifficultyFilter === "easy"}
              onClick={() => onDifficultyFilterChange("easy")}
            />
            <StatCard
              label="กลาง"
              value={allStats.medium}
              sub={`${allPct(allStats.medium)}%`}
              tone="amber"
              active={activeDifficultyFilter === "medium"}
              onClick={() => onDifficultyFilterChange("medium")}
            />
            <StatCard
              label="ยาก"
              value={allStats.hard}
              sub={`${allPct(allStats.hard)}%`}
              tone="rose"
              active={activeDifficultyFilter === "hard"}
              onClick={() => onDifficultyFilterChange("hard")}
            />
          </div>

          <div className="mt-5 rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-[#514667]">
              <span>ค่าเฉลี่ยพารามิเตอร์</span>
              <span className="text-xs font-medium text-[#7A7287]">
                คำนวณจาก {total} ข้อที่แสดง
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <AverageParamCard
                code="b"
                label="ความยากเฉลี่ย"
                value={avgDifficulty}
              />
              <AverageParamCard
                code="a"
                label="อำนาจจำแนกเฉลี่ย"
                value={avgDiscrimination}
              />
              <AverageParamCard
                code="c"
                label="การเดาเฉลี่ย"
                value={avgGuessing}
              />
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-[#7A7287]">
              <span className="font-semibold text-[#514667]">
                การกระจายระดับความยาก
              </span>
              {allStats.untagged > 0 && (
                <span className="text-amber-600">
                  {allStats.untagged} ข้อยังไม่มีระดับความยาก
                </span>
              )}
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-white ring-1 ring-[#E7DDF8]">
              {allStats.easy > 0 && (
                <div
                  style={{ width: `${distributionPct(allStats.easy)}%` }}
                  className="bg-emerald-400"
                  title={`ง่าย ${allStats.easy} ข้อ`}
                />
              )}
              {allStats.medium > 0 && (
                <div
                  style={{ width: `${distributionPct(allStats.medium)}%` }}
                  className="bg-amber-400"
                  title={`กลาง ${allStats.medium} ข้อ`}
                />
              )}
              {allStats.hard > 0 && (
                <div
                  style={{ width: `${distributionPct(allStats.hard)}%` }}
                  className="bg-rose-400"
                  title={`ยาก ${allStats.hard} ข้อ`}
                />
              )}
            </div>
          </div>
        </div>

        <aside className="rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#514667]">
              <Tags size={15} className="text-[#7C5BD9]" />
              จำนวนข้อตามหมวดหมู่ความรู้
            </div>
            {categories.length > 0 && (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                {categories.length} หมวดหมู่
              </span>
            )}
          </div>
          {categories.length === 0 ? (
            <p className="text-sm font-medium text-[#B7AFC6]">
              ไม่มีหมวดหมู่ที่กำหนด
            </p>
          ) : (
            <ul className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
              {categories.map((c) => {
                const percent = categoryPct(c.count);
                return (
                  <li
                    key={c.name}
                    className="rounded-xl bg-white p-3 text-sm font-medium text-[#514667] ring-1 ring-[#E7DDF8]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="line-clamp-2 min-w-0 break-words leading-snug"
                        title={c.name}
                      >
                        {c.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-[#F4EFFF] px-2.5 py-1 text-xs font-semibold text-[#7C5BD9]">
                        {c.count} ข้อ
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F4EFFF]">
                        <div
                          className="h-full rounded-full bg-[#9C7AE6]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-semibold text-[#7C5BD9]">
                        {percent}%
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-medium text-[#7A7287]">
                      {c.count} จาก {total} ข้อ
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}

function AverageParamCard({
  code,
  label,
  value,
}: {
  code: "a" | "b" | "c";
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-[#E7DDF8]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#514667]">{label}</span>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#F4EFFF] px-2 text-xs font-semibold text-[#7C5BD9]">
          {code}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold leading-none text-[#2F2A3A]">
        {formatQuestionParam(value)}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
  active = false,
  onClick,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone: "emerald" | "amber" | "rose" | "purple";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    purple: "bg-[#F4EFFF] text-[#7C5BD9]",
  } as const;
  const accent = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    purple: "bg-[#B7A3E3]",
  } as const;
  const iconBg = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    purple: "bg-white/70 text-[#7C5BD9]",
  } as const;
  const className = `relative w-full overflow-hidden rounded-xl px-4 py-3 text-left ring-1 transition ${tones[tone]} ${
    active
      ? "shadow-sm ring-2 ring-[#7C5BD9] outline outline-2 outline-offset-2 outline-[#7C5BD9]/20"
      : "ring-white/70"
  } ${
    onClick
      ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C5BD9]"
      : ""
  }`;

  const content = (
    <>
      {onClick && (
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-1 ${accent[tone]}`}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold opacity-85">{label}</div>
        {onClick ? (
          <span
            className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold ring-1 ring-white/70 ${iconBg[tone]}`}
          >
            <Filter size={12} />
            {active ? "กำลังกรอง" : "ตัวกรอง"}
          </span>
        ) : (
          active && (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold">
              กำลังกรอง
            </span>
          )
        )}
      </div>
      <div className="mt-1 text-2xl font-semibold leading-none">{value}</div>
      {sub && <div className="mt-1 text-xs font-medium opacity-70">{sub}</div>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={className}
        title={active ? `ยกเลิกตัวกรองระดับ${label}` : `กรองคำถามระดับ${label}`}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
