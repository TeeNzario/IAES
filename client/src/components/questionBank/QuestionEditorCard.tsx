"use client";

import React, { useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import TagSelect, { KnowledgeTag } from "./TagSelect";
import type { Choice, Question, QuestionType } from "./types";
import { FIELD_LIMITS, maxLengthMessage } from "@/config/fieldLimits";
import {
  QUESTION_PARAM_LIMITS,
  QuestionParamKey,
  questionParamRangeMessage,
} from "@/config/questionParamLimits";

const QUESTION_TEXT_MAX_LENGTH = FIELD_LIMITS.questionText;
const CHOICE_TEXT_MAX_LENGTH = FIELD_LIMITS.choiceText;
const DIFFICULTY_PARAM_MIN = QUESTION_PARAM_LIMITS.difficulty.min;
const DIFFICULTY_PARAM_MAX = QUESTION_PARAM_LIMITS.difficulty.max;
const DISCRIMINATION_PARAM_MIN = QUESTION_PARAM_LIMITS.discrimination.min;
const DISCRIMINATION_PARAM_MAX = QUESTION_PARAM_LIMITS.discrimination.max;
const GUESSING_PARAM_MIN = QUESTION_PARAM_LIMITS.guessing.min;
const GUESSING_PARAM_MAX = QUESTION_PARAM_LIMITS.guessing.max;

export interface DraftQuestion {
  /** Local-only id; not sent to the backend. */
  draft_id: string;
  question_text: string;
  question_type: QuestionType;
  choices: Choice[];
  difficulty_param: number | "";
  discrimination_param: number | "";
  guessing_param: number | "";
  knowledge_category_ids: string[];
}

export interface DifficultyOption {
  label: string;
  value: number;
}

export function makeEmptyDraft(): DraftQuestion {
  return {
    draft_id: `d_${Math.random().toString(36).slice(2, 10)}`,
    question_text: "",
    question_type: "MCQ_SINGLE",
    choices: [
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
    ],
    difficulty_param: "",
    discrimination_param: "",
    guessing_param: 0.25,
    knowledge_category_ids: [],
  };
}

function isFiniteNumber(value: number | ""): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function questionParamRangeError(
  value: number | "",
  param: QuestionParamKey,
): string | null {
  if (!isFiniteNumber(value)) return null;
  const { min, max } = QUESTION_PARAM_LIMITS[param];
  if (value < min || value > max) {
    return questionParamRangeMessage(param);
  }
  return null;
}

function questionParamRequiredOrRangeError(
  value: number | "",
  param: QuestionParamKey,
  requiredMessage: string,
): string | null {
  if (!isFiniteNumber(value)) return requiredMessage;
  return questionParamRangeError(value, param);
}

/**
 * Build a fresh DraftQuestion from an existing Question row.
 * Used by the list-page inline edit dropdown.
 */
export function draftFromQuestion(q: Question): DraftQuestion {
  return {
    draft_id: `q_${q.question_id}`,
    question_text: q.question_text,
    question_type: "MCQ_SINGLE",
    choices: q.choices.map((c) => ({
      choice_id: c.choice_id,
      choice_text: c.choice_text,
      is_correct: c.is_correct,
      display_order: c.display_order,
    })),
    difficulty_param:
      typeof q.difficulty_param === "number" ? q.difficulty_param : "",
    discrimination_param:
      typeof q.discrimination_param === "number"
        ? q.discrimination_param
        : "",
    guessing_param:
      typeof q.guessing_param === "number" ? q.guessing_param : "",
    knowledge_category_ids: q.knowledge_categories.map(
      (t) => t.knowledge_category_id,
    ),
  };
}

/**
 * A question draft is valid iff every spec rule is satisfied:
 *  - question text not empty
 *  - ≥ 2 choices, all non-empty
 *  - EXACTLY 1 choice marked correct (single-MCQ only)
 *  - difficulty / discrimination / guessing all finite numbers
 *  - at least 1 knowledge tag
 */
export function isDraftValid(d: DraftQuestion): boolean {
  if (!d.question_text.trim()) return false;
  if (d.question_text.trim().length > QUESTION_TEXT_MAX_LENGTH) return false;
  if (d.choices.length < 2) return false;
  if (d.choices.some((c) => !c.choice_text.trim())) return false;
  if (
    d.choices.some((c) => c.choice_text.trim().length > CHOICE_TEXT_MAX_LENGTH)
  )
    return false;
  const correctCount = d.choices.filter((c) => c.is_correct).length;
  if (correctCount !== 1) return false;
  for (const v of [
    d.difficulty_param,
    d.discrimination_param,
    d.guessing_param,
  ]) {
    if (!isFiniteNumber(v)) return false;
  }
  if (
    questionParamRangeError(d.difficulty_param, "difficulty") ||
    questionParamRangeError(d.discrimination_param, "discrimination") ||
    questionParamRangeError(d.guessing_param, "guessing")
  )
    return false;
  if (d.knowledge_category_ids.length < 1) return false;
  return true;
}

/** First human-readable reason a draft is invalid, or null if valid. */
export function firstInvalidReason(
  d: DraftQuestion,
  fixedChoiceCount?: number,
): string | null {
  if (!d.question_text.trim()) return "ต้องกรอกข้อความคำถาม";
  if (d.question_text.trim().length > QUESTION_TEXT_MAX_LENGTH)
    return maxLengthMessage("ข้อความคำถาม", QUESTION_TEXT_MAX_LENGTH);
  if (fixedChoiceCount != null && d.choices.length !== fixedChoiceCount)
    return `ต้องมี ${fixedChoiceCount} ตัวเลือก`;
  if (d.choices.length < 2) return "ต้องมีอย่างน้อย 2 ตัวเลือก";
  if (d.choices.some((c) => !c.choice_text.trim()))
    return "ตัวเลือกต้องไม่ว่าง";
  if (
    d.choices.some((c) => c.choice_text.trim().length > CHOICE_TEXT_MAX_LENGTH)
  )
    return maxLengthMessage("ข้อความตัวเลือก", CHOICE_TEXT_MAX_LENGTH);
  const correct = d.choices.filter((c) => c.is_correct).length;
  if (correct !== 1) return "ต้องเลือกคำตอบที่ถูกเพียง 1 ข้อ";
  if (
    !isFiniteNumber(d.difficulty_param) ||
    !isFiniteNumber(d.discrimination_param) ||
    !isFiniteNumber(d.guessing_param)
  )
    return "ต้องกรอกความยาก / อำนาจการจำแนก / โอกาสการเดา";
  const difficultyError = questionParamRequiredOrRangeError(
    d.difficulty_param,
    "difficulty",
    "ต้องกรอกความยาก",
  );
  if (difficultyError) return difficultyError;
  const discriminationError = questionParamRequiredOrRangeError(
    d.discrimination_param,
    "discrimination",
    "ต้องกรอกอำนาจการจำแนก",
  );
  if (discriminationError) return discriminationError;
  const guessingError = questionParamRequiredOrRangeError(
    d.guessing_param,
    "guessing",
    "ต้องกรอกโอกาสการเดา",
  );
  if (guessingError) return guessingError;
  if (d.knowledge_category_ids.length < 1)
    return "ต้องเลือกหมวดหมู่ความรู้อย่างน้อย 1 รายการ";
  return null;
}

interface Props {
  index: number;
  draft: DraftQuestion;
  tags: KnowledgeTag[];
  /** Whether this card starts in edit mode. New cards default to edit. */
  initialEditing?: boolean;
  /** Hide the card-level header (number + edit/delete icons). */
  hideHeader?: boolean;
  /** Whether the ยืนยัน button is currently submitting (shows spinner-ish state). */
  saving?: boolean;
  onChange: (next: DraftQuestion) => void;
  onDelete: () => void;
  /** If provided, ยืนยัน calls this instead of just flipping local edit state. */
  onConfirm?: (draft: DraftQuestion) => Promise<void> | void;
  /** If provided, ยกเลิก calls this in addition to reverting local state. */
  onCancel?: () => void;
  /** Lock choices to an exact count (e.g. 4). */
  fixedChoiceCount?: number;
  /** Use dropdown for difficulty instead of free number input. */
  difficultyOptions?: DifficultyOption[];
}

export default function QuestionEditorCard({
  index,
  draft,
  tags,
  initialEditing = true,
  hideHeader = false,
  saving = false,
  onChange,
  onDelete,
  onConfirm,
  onCancel,
  fixedChoiceCount,
  difficultyOptions,
}: Props) {
  const [editing, setEditing] = useState(initialEditing);
  // Snapshot for cancel.
  const [snapshot, setSnapshot] = useState<DraftQuestion>(draft);
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<DraftQuestion>) => {
    setDirty(true);
    onChange({ ...draft, ...patch });
  };

  const setChoice = (i: number, patch: Partial<Choice>) => {
    const next = draft.choices.map((c, idx) =>
      idx === i ? { ...c, ...patch } : c,
    );
    update({ choices: next });
  };

  const toggleCorrect = (i: number) => {
    // Always single-correct: selecting one deselects all others.
    update({
      choices: draft.choices.map((c, idx) => ({
        ...c,
        is_correct: idx === i,
      })),
    });
  };

  const addChoice = () =>
    update({
      choices: [...draft.choices, { choice_text: "", is_correct: false }],
    });

  const removeChoice = (i: number) => {
    if (fixedChoiceCount != null) return;
    if (draft.choices.length <= 2) return;
    update({ choices: draft.choices.filter((_, idx) => idx !== i) });
  };

  const selectedKnowledgeTags = draft.knowledge_category_ids
    .map((id) => tags.find((tg) => tg.knowledge_category_id === id))
    .filter((t): t is KnowledgeTag => Boolean(t));
  const currentGuessingParamError = editing
    ? questionParamRangeError(draft.guessing_param, "guessing")
    : null;
  const currentDifficultyParamError = editing
    ? questionParamRangeError(draft.difficulty_param, "difficulty")
    : null;
  const currentDiscriminationParamError = editing
    ? questionParamRangeError(draft.discrimination_param, "discrimination")
    : null;

  const startEdit = () => {
    setSnapshot(draft);
    setDirty(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    onChange(snapshot);
    setDirty(false);
    setEditing(false);
    onCancel?.();
  };

  const confirmEdit = async () => {
    if (onConfirm) {
      // Caller is responsible for closing/refreshing on success.
      await onConfirm(draft);
      return;
    }
    setSnapshot(draft);
    setEditing(false);
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
      {!hideHeader && (
        <div className="mb-5 flex items-start justify-between">
          <h3 className="text-base font-semibold text-[#2F2A3A] sm:text-lg">
            คำถามข้อ {index + 1}
          </h3>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9CCF2] text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                aria-label="แก้ไข"
              >
                <Pencil size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9CCF2] text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
              aria-label="ลบ"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Question text */}
      {editing ? (
        <div className="mb-6">
          <textarea
            value={draft.question_text}
            onChange={(e) => update({ question_text: e.target.value })}
            maxLength={QUESTION_TEXT_MAX_LENGTH}
            rows={6}
            placeholder="พิมพ์ข้อความคำถามที่นี่..."
            className="w-full min-h-40 resize-y rounded-2xl bg-white px-5 py-4 text-base font-normal leading-relaxed text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition placeholder:text-[#B7AFC6] focus:ring-2 focus:ring-[#B7A3E3]"
          />
          <p className="mt-1 text-right text-[11px] font-medium text-[#7A7287]">
            {draft.question_text.length}/{QUESTION_TEXT_MAX_LENGTH}
          </p>
        </div>
      ) : (
        <p className="mb-6 whitespace-pre-wrap text-base font-normal leading-relaxed text-[#514667]">
          {draft.question_text || "(ไม่มีข้อความ)"}
        </p>
      )}

      {/* Choices (single-correct MCQ only) */}
      <div className="space-y-3">
        {draft.choices.map((c, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="radio"
              checked={c.is_correct}
              disabled={!editing}
              onChange={() => toggleCorrect(i)}
              name={`correct-${draft.draft_id}`}
              className="h-5 w-5 accent-[#B7A3E3]"
            />
            {editing ? (
              <textarea
                value={c.choice_text}
                onChange={(e) => setChoice(i, { choice_text: e.target.value })}
                maxLength={CHOICE_TEXT_MAX_LENGTH}
                rows={2}
                placeholder={`ตัวเลือก ${i + 1}`}
                className="flex-1 min-h-16 rounded-xl bg-white px-4 py-3 text-sm font-normal leading-relaxed text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition placeholder:text-[#B7AFC6] focus:ring-2 focus:ring-[#B7A3E3]"
              />
            ) : (
              <span className="flex-1 text-sm font-normal text-[#514667]">
                {c.choice_text || `ตัวเลือก ${i + 1}`}
              </span>
            )}
            {editing && fixedChoiceCount == null && draft.choices.length > 2 && (
              <button
                type="button"
                onClick={() => removeChoice(i)}
                className="text-[#B7AFC6] transition-colors hover:text-rose-500 cursor-pointer"
                aria-label="ลบตัวเลือก"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      {editing && fixedChoiceCount == null && (
        <button
          type="button"
          onClick={addChoice}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#B7A3E3] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#A48FD6] cursor-pointer"
        >
          <Plus size={16} /> เพิ่มตัวเลือก
        </button>
      )}

      {/* IRT params */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {difficultyOptions && difficultyOptions.length > 0 ? (
          <DifficultySelectField
            label="ความยาก"
            value={draft.difficulty_param}
            editing={editing}
            options={difficultyOptions}
            onChange={(v) => update({ difficulty_param: v })}
          />
        ) : (
          <NumberField
            label="ความยาก"
            value={draft.difficulty_param}
            editing={editing}
            min={DIFFICULTY_PARAM_MIN}
            max={DIFFICULTY_PARAM_MAX}
            step={0.01}
            helpText={`กรอกได้ตั้งแต่ ${DIFFICULTY_PARAM_MIN} ถึง ${DIFFICULTY_PARAM_MAX}`}
            error={currentDifficultyParamError}
            onChange={(v) => update({ difficulty_param: v })}
          />
        )}
        <NumberField
          label="อำนาจการจำแนก"
          value={draft.discrimination_param}
          editing={editing}
          min={DISCRIMINATION_PARAM_MIN}
          max={DISCRIMINATION_PARAM_MAX}
          step={0.01}
          helpText={`กรอกได้ตั้งแต่ ${DISCRIMINATION_PARAM_MIN} ถึง ${DISCRIMINATION_PARAM_MAX}`}
          error={currentDiscriminationParamError}
          onChange={(v) => update({ discrimination_param: v })}
        />
        <NumberField
          label="โอกาสการเดา"
          value={draft.guessing_param}
          editing={editing}
          min={GUESSING_PARAM_MIN}
          max={GUESSING_PARAM_MAX}
          step={0.01}
          helpText={`กรอกได้ตั้งแต่ ${GUESSING_PARAM_MIN} ถึง ${GUESSING_PARAM_MAX}`}
          error={currentGuessingParamError}
          onChange={(v) => update({ guessing_param: v })}
        />
      </div>

      {/* Tags */}
      <div className="mt-8 rounded-2xl bg-[#FAF8FF] p-4 ring-1 ring-[#E7DDF8]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
              <Tags size={16} />
            </span>
            <label className="text-sm font-semibold text-[#2F2A3A]">
              หมวดหมู่ความรู้
            </label>
          </div>
          {selectedKnowledgeTags.length > 0 && (
            <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              มี {selectedKnowledgeTags.length} หมวดหมู่
            </span>
          )}
        </div>

        {editing ? (
          <TagSelect
            options={tags}
            value={draft.knowledge_category_ids}
            onChange={(ids) => update({ knowledge_category_ids: ids })}
          />
        ) : (
          <div className="max-h-44 overflow-y-auto rounded-xl bg-white p-2 ring-1 ring-[#EFE8FB]">
            {selectedKnowledgeTags.length === 0 ? (
              <p className="px-2.5 py-2 text-sm font-medium text-[#7A7287]">
                ไม่มีหมวดหมู่ความรู้
              </p>
            ) : (
              <ol className="space-y-1.5">
                {selectedKnowledgeTags.map((t, idx) => (
                  <li
                    key={t.knowledge_category_id}
                    className="flex items-start gap-2 rounded-lg px-2.5 py-2"
                    title={t.name}
                  >
                    <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F4EFFF] text-[11px] font-semibold text-[#7C5BD9]">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-sm font-medium leading-relaxed text-[#2F2A3A]">
                      {t.name}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          {(() => {
            const reason = firstInvalidReason(draft, fixedChoiceCount);
            const valid = reason === null;
            return (
              <>
                {!valid && dirty && (
                  <span className="mr-2 text-sm font-medium text-rose-500">
                    {reason}
                  </span>
                )}
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-[#D9CCF2] bg-white px-5 py-2.5 text-sm font-semibold text-[#514667] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmEdit}
                  disabled={!valid || saving}
                  aria-disabled={!valid || saving}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${
                    valid && !saving
                      ? "bg-[#B7A3E3] hover:bg-[#A48FD6] cursor-pointer"
                      : "bg-[#B7A3E3] opacity-50 cursor-not-allowed"
                  }`}
                >
                  {saving ? "กำลังบันทึก..." : "ยืนยัน"}
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function DifficultySelectField({
  label,
  value,
  editing,
  options,
  onChange,
}: {
  label: string;
  value: number | "";
  editing: boolean;
  options: DifficultyOption[];
  onChange: (v: number | "") => void;
}) {
  const selected =
    typeof value === "number" ? options.find((op) => op.value === value) : null;

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#514667]">
        {label}
      </label>
      {editing ? (
        <select
          value={typeof value === "number" ? String(value) : ""}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? "" : Number(raw));
          }}
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-normal text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
        >
          <option value="">เลือกระดับความยาก</option>
          {options.map((op) => (
            <option key={op.label} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="w-full rounded-xl bg-[#FAF8FF] px-4 py-3 text-sm font-medium text-[#514667] ring-1 ring-[#EFE8FB]">
          {selected?.label ?? "-"}
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  editing,
  onChange,
  min,
  max,
  step = 0.1,
  helpText,
  error,
}: {
  label: string;
  value: number | "";
  editing: boolean;
  onChange: (v: number | "") => void;
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
  error?: string | null;
}) {
  const hintId = `${label.replace(/\s+/g, "-")}-hint`;

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#514667]">
        {label}
      </label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        readOnly={!editing}
        aria-invalid={Boolean(error)}
        aria-describedby={error || helpText ? hintId : undefined}
        onKeyDown={(e) => {
          if (min !== undefined && min >= 0 && e.key === "-") {
            e.preventDefault();
          }
        }}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? "" : Number(raw));
        }}
        className={`w-full rounded-xl bg-white px-4 py-3 text-sm font-normal text-[#2F2A3A] shadow-sm outline-none ring-1 transition focus:ring-2 read-only:bg-[#FAF8FF] ${
          error
            ? "ring-rose-300 focus:ring-rose-400"
            : "ring-[#E7DDF8] focus:ring-[#B7A3E3]"
        }`}
      />
      {(error || helpText) && (
        <p
          id={hintId}
          className={`mt-1.5 text-xs font-medium ${
            error ? "text-rose-500" : "text-[#7A7287]"
          }`}
        >
          {error ?? helpText}
        </p>
      )}
    </div>
  );
}
