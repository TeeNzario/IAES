"use client";

import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import TagSelect, { KnowledgeTag } from "./TagSelect";
import type { Choice, Question, QuestionType } from "./types";

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

export function makeEmptyDraft(): DraftQuestion {
  return {
    draft_id: `d_${Math.random().toString(36).slice(2, 10)}`,
    question_text: "",
    question_type: "MCQ_SINGLE",
    choices: [
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
    ],
    difficulty_param: "",
    discrimination_param: "",
    guessing_param: "",
    knowledge_category_ids: [],
  };
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
  if (d.choices.length < 2) return false;
  if (d.choices.some((c) => !c.choice_text.trim())) return false;
  const correctCount = d.choices.filter((c) => c.is_correct).length;
  if (correctCount !== 1) return false;
  for (const v of [
    d.difficulty_param,
    d.discrimination_param,
    d.guessing_param,
  ]) {
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
  }
  if (d.knowledge_category_ids.length < 1) return false;
  return true;
}

/** First human-readable reason a draft is invalid, or null if valid. */
export function firstInvalidReason(d: DraftQuestion): string | null {
  if (!d.question_text.trim()) return "ต้องกรอกข้อความคำถาม";
  if (d.choices.length < 2) return "ต้องมีอย่างน้อย 2 ตัวเลือก";
  if (d.choices.some((c) => !c.choice_text.trim()))
    return "ตัวเลือกต้องไม่ว่าง";
  const correct = d.choices.filter((c) => c.is_correct).length;
  if (correct !== 1) return "ต้องเลือกคำตอบที่ถูกเพียง 1 ข้อ";
  if (
    typeof d.difficulty_param !== "number" ||
    typeof d.discrimination_param !== "number" ||
    typeof d.guessing_param !== "number"
  )
    return "ต้องกรอกความยาก / การแจกแจง / การเดา";
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
}: Props) {
  const [editing, setEditing] = useState(initialEditing);
  // Snapshot for cancel.
  const [snapshot, setSnapshot] = useState<DraftQuestion>(draft);

  const update = (patch: Partial<DraftQuestion>) =>
    onChange({ ...draft, ...patch });

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
    if (draft.choices.length <= 2) return;
    update({ choices: draft.choices.filter((_, idx) => idx !== i) });
  };

  const startEdit = () => {
    setSnapshot(draft);
    setEditing(true);
  };

  const cancelEdit = () => {
    onChange(snapshot);
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
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {!hideHeader && (
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-base font-medium text-[#575757]">
            คำถามข้อ {index + 1}
          </h3>
          <div className="flex items-center gap-1">
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#B7A3E3] text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
                aria-label="แก้ไข"
              >
                <Pencil size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#B7A3E3] text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
              aria-label="ลบ"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Question text */}
      {editing ? (
        <textarea
          value={draft.question_text}
          onChange={(e) => update({ question_text: e.target.value })}
          rows={2}
          placeholder="ข้อความคำถาม"
          className="mb-3 w-full resize-none rounded-lg bg-[#F4EFFF] px-3 py-2 text-sm font-light text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3]"
        />
      ) : (
        <p className="mb-3 whitespace-pre-wrap text-sm font-light text-[#575757]">
          {draft.question_text || "(ไม่มีข้อความ)"}
        </p>
      )}

      {/* Choices (single-correct MCQ only) */}
      <div className="space-y-2">
        {draft.choices.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={c.is_correct}
              disabled={!editing}
              onChange={() => toggleCorrect(i)}
              name={`correct-${draft.draft_id}`}
              className="accent-[#B7A3E3]"
            />
            {editing ? (
              <input
                type="text"
                value={c.choice_text}
                onChange={(e) => setChoice(i, { choice_text: e.target.value })}
                placeholder={`ตัวเลือก ${i + 1}`}
                className="flex-1 rounded-md bg-[#F4EFFF] px-3 py-1.5 text-sm font-light text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3]"
              />
            ) : (
              <span className="flex-1 text-sm font-light text-[#575757]">
                {c.choice_text || `ตัวเลือก ${i + 1}`}
              </span>
            )}
            {editing && draft.choices.length > 2 && (
              <button
                type="button"
                onClick={() => removeChoice(i)}
                className="text-gray-400 hover:text-rose-500 cursor-pointer"
                aria-label="ลบตัวเลือก"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <button
          type="button"
          onClick={addChoice}
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-[#B7A3E3] px-3 py-1 text-xs text-white hover:bg-[#A48FD6] cursor-pointer"
        >
          <Plus size={12} /> เพิ่มตัวเลือก
        </button>
      )}

      {/* IRT params */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <NumberField
          label="ความยาก"
          value={draft.difficulty_param}
          editing={editing}
          onChange={(v) => update({ difficulty_param: v })}
        />
        <NumberField
          label="การแจกแจง"
          value={draft.discrimination_param}
          editing={editing}
          onChange={(v) => update({ discrimination_param: v })}
        />
        <NumberField
          label="การเดา"
          value={draft.guessing_param}
          editing={editing}
          onChange={(v) => update({ guessing_param: v })}
        />
      </div>

      {/* Tags */}
      <div className="mt-4">
        <label className="mb-1 block text-xs font-light text-[#575757]">
          หมวดหมู่ความรู้
        </label>
        {editing ? (
          <TagSelect
            options={tags}
            value={draft.knowledge_category_ids}
            onChange={(ids) => update({ knowledge_category_ids: ids })}
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {draft.knowledge_category_ids.length === 0 ? (
              <span className="text-xs text-gray-400">-</span>
            ) : (
              draft.knowledge_category_ids.map((id) => {
                const t = tags.find((tg) => tg.knowledge_category_id === id);
                return (
                  <span
                    key={id}
                    className="rounded-full bg-[#B7A3E3] px-2.5 py-0.5 text-xs text-white"
                  >
                    {t?.name ?? id}
                  </span>
                );
              })
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-4 flex items-center justify-end gap-2">
          {(() => {
            const reason = firstInvalidReason(draft);
            const valid = reason === null;
            return (
              <>
                {!valid && (
                  <span className="mr-2 text-xs font-light text-rose-500">
                    {reason}
                  </span>
                )}
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md border border-[#B7A3E3] px-4 py-1 text-sm text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmEdit}
                  disabled={!valid || saving}
                  aria-disabled={!valid || saving}
                  className={`rounded-md px-4 py-1 text-sm text-white ${
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

function NumberField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: number | "";
  editing: boolean;
  onChange: (v: number | "") => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-light text-[#575757]">
        {label}
      </label>
      <input
        type="number"
        step="0.1"
        value={value}
        readOnly={!editing}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? "" : Number(raw));
        }}
        className="w-full rounded-md bg-[#F4EFFF] px-3 py-1.5 text-sm font-light text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3] read-only:bg-gray-100"
      />
    </div>
  );
}
