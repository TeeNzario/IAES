"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronLeft, Plus, Trash2, Upload } from "lucide-react";
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
  if (!opts.hideSchedule) {
    if (!cfg.start_time) return "ต้องกรอกเวลาเริ่ม";
    if (!cfg.end_time) return "ต้องกรอกเวลาสิ้นสุด";
    const start = new Date(cfg.start_time);
    const end = new Date(cfg.end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return "รูปแบบเวลาไม่ถูกต้อง";
    if (start >= end) return "เวลาเริ่มต้องก่อนเวลาสิ้นสุด";
    if (opts.mode === "create" && start.getTime() < Date.now() - 60_000)
      return "เวลาเริ่มต้องไม่ใช่เวลาในอดีต";
  }
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
      const s = new Date(config.start_time);
      if (Number.isNaN(s.getTime())) {
        out.start = "รูปแบบวันที่ไม่ถูกต้อง";
      } else if (mode === "create" && s.getTime() < Date.now() - 60_000) {
        out.start = "วันสอบต้องไม่ใช่เวลาในอดีต";
      }
    }
    if (!config.end_time) {
      out.end = "กรุณาเลือกวันและเวลาสิ้นสุด";
    } else {
      const e = new Date(config.end_time);
      if (Number.isNaN(e.getTime())) {
        out.end = "รูปแบบวันที่ไม่ถูกต้อง";
      } else if (config.start_time) {
        const s = new Date(config.start_time);
        if (!Number.isNaN(s.getTime()) && s >= e) {
          out.end = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
        }
      }
    }
    return out;
  }, [config.start_time, config.end_time, mode, hideSchedule]);

  // Aggregate stats for the selected questions panel.
  const stats = useMemo(() => {
    const total = selected.length;
    let easy = 0;
    let medium = 0;
    let hard = 0;
    let untagged = 0;
    let diffSum = 0;
    let diffCount = 0;
    const byCategory = new Map<string, { name: string; count: number }>();

    for (const q of selected) {
      const d = q.difficulty_param;
      if (typeof d === "number" && Number.isFinite(d)) {
        diffSum += d;
        diffCount += 1;
        if (d < 0) easy += 1;
        else if (d === 0) medium += 1;
        else hard += 1;
      } else {
        untagged += 1;
      }
      for (const t of q.knowledge_categories ?? []) {
        const cur = byCategory.get(t.knowledge_category_id);
        if (cur) cur.count += 1;
        else
          byCategory.set(t.knowledge_category_id, {
            name: t.name,
            count: 1,
          });
      }
    }
    const avgDifficulty = diffCount > 0 ? diffSum / diffCount : null;
    return {
      total,
      easy,
      medium,
      hard,
      untagged,
      avgDifficulty,
      categories: Array.from(byCategory.values()).sort(
        (a, b) => b.count - a.count,
      ),
    };
  }, [selected]);

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
          : new Date(config.start_time).toISOString();
      const endIso =
        hideSchedule && !config.end_time
          ? PLACEHOLDER_END()
          : new Date(config.end_time).toISOString();
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
            onClick={() => router.push(backHref ?? `/course/${offeringId}`)}
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

        {/* Config — schedule (hidden in set-creation flow) */}
        {!hideSchedule && (
          <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-2">
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
                className={`w-full rounded-md bg-[#F4EFFF] px-3 py-1.5 text-sm font-light text-[#575757] outline-none focus:ring-2 ${
                  dateErrors.start
                    ? "ring-2 ring-rose-300 focus:ring-rose-400"
                    : "focus:ring-[#B7A3E3]"
                }`}
              />
              {dateErrors.start && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                  <AlertCircle size={12} />
                  {dateErrors.start}
                </p>
              )}
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
                className={`w-full rounded-md bg-[#F4EFFF] px-3 py-1.5 text-sm font-light text-[#575757] outline-none focus:ring-2 ${
                  dateErrors.end
                    ? "ring-2 ring-rose-300 focus:ring-rose-400"
                    : "focus:ring-[#B7A3E3]"
                }`}
              />
              {dateErrors.end && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                  <AlertCircle size={12} />
                  {dateErrors.end}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats panel — overview of currently selected questions */}
        <ExamStatsPanel stats={stats} />

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

interface ExamStats {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  untagged: number;
  avgDifficulty: number | null;
  categories: { name: string; count: number }[];
}

function ExamStatsPanel({ stats }: { stats: ExamStats }) {
  const { total, easy, medium, hard, untagged, avgDifficulty, categories } =
    stats;

  if (total === 0) return null;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const maxCat = categories.reduce((m, c) => Math.max(m, c.count), 0);

  return (
    <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#575757]">
          สถิติชุดข้อสอบ
        </h3>
        <span className="rounded-full bg-[#F4EFFF] px-3 py-0.5 text-xs font-medium text-[#B7A3E3]">
          ทั้งหมด {total} ข้อ
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="ง่าย"
          value={easy}
          sub={`${pct(easy)}%`}
          tone="emerald"
        />
        <StatCard
          label="กลาง"
          value={medium}
          sub={`${pct(medium)}%`}
          tone="amber"
        />
        <StatCard
          label="ยาก"
          value={hard}
          sub={`${pct(hard)}%`}
          tone="rose"
        />
        <StatCard
          label="ความยากเฉลี่ย"
          value={avgDifficulty === null ? "-" : avgDifficulty.toFixed(2)}
          sub={avgDifficulty === null ? "ไม่มีข้อมูล" : "ค่า θ"}
          tone="purple"
        />
      </div>

      {/* Difficulty distribution bar */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-gray-500">
          <span>การกระจายระดับความยาก</span>
          {untagged > 0 && (
            <span className="text-amber-600">
              {untagged} ข้อยังไม่มีระดับความยาก
            </span>
          )}
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          {easy > 0 && (
            <div
              style={{ width: `${pct(easy)}%` }}
              className="bg-emerald-400"
              title={`ง่าย ${easy} ข้อ`}
            />
          )}
          {medium > 0 && (
            <div
              style={{ width: `${pct(medium)}%` }}
              className="bg-amber-400"
              title={`กลาง ${medium} ข้อ`}
            />
          )}
          {hard > 0 && (
            <div
              style={{ width: `${pct(hard)}%` }}
              className="bg-rose-400"
              title={`ยาก ${hard} ข้อ`}
            />
          )}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="mt-5">
        <div className="mb-2 text-[11px] text-gray-500">
          จำนวนข้อตามหมวดหมู่ความรู้
        </div>
        {categories.length === 0 ? (
          <p className="text-xs text-gray-400">— ไม่มีหมวดหมู่ที่กำหนด —</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.name}
                className="grid grid-cols-[140px_1fr_40px] items-center gap-3 text-xs text-[#575757]"
              >
                <span className="truncate" title={c.name}>
                  {c.name}
                </span>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#F4EFFF]">
                  <div
                    className="h-full rounded-full bg-[#B7A3E3]"
                    style={{
                      width: `${maxCat > 0 ? (c.count / maxCat) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-right font-medium">{c.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone: "emerald" | "amber" | "rose" | "purple";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    purple: "bg-[#F4EFFF] text-[#7C5BD9]",
  } as const;
  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone]}`}>
      <div className="text-[11px] font-light opacity-80">{label}</div>
      <div className="mt-1 text-xl font-semibold leading-none">{value}</div>
      {sub && (
        <div className="mt-1 text-[11px] font-light opacity-70">{sub}</div>
      )}
    </div>
  );
}
