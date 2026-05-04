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
export function firstInvalidReason(
  d: DraftQuestion,
  fixedChoiceCount?: number,
): string | null {
  if (!d.question_text.trim()) return "ต้องกรอกข้อความคำถาม";
  if (fixedChoiceCount != null && d.choices.length !== fixedChoiceCount)
    return `ต้องมี ${fixedChoiceCount} ตัวเลือก`;
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
    return "ต้องกรอกความยาก / อำนาจการจำแนก / โอกาสการเดา";
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
  /** Knowledge categories visual style in both edit and view mode. */
  knowledgeDisplayMode?: "badge" | "list";
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
  knowledgeDisplayMode = "badge",
}: Props) {
  const [editing, setEditing] = useState(initialEditing);
  // Snapshot for cancel.
  const [snapshot, setSnapshot] = useState<DraftQuestion>(draft);
  const [showAddKnowledgeDropdown, setShowAddKnowledgeDropdown] =
    useState(false);

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
    if (fixedChoiceCount != null) return;
    if (draft.choices.length <= 2) return;
    update({ choices: draft.choices.filter((_, idx) => idx !== i) });
  };

  const selectedKnowledgeTags = draft.knowledge_category_ids
    .map((id) => tags.find((tg) => tg.knowledge_category_id === id))
    .filter((t): t is KnowledgeTag => Boolean(t));

  const availableKnowledgeTags = tags.filter(
    (tg) => !draft.knowledge_category_ids.includes(tg.knowledge_category_id),
  );

  const addKnowledgeCategory = (id: string) => {
    if (!id) return;
    if (draft.knowledge_category_ids.includes(id)) return;
    update({ knowledge_category_ids: [...draft.knowledge_category_ids, id] });
  };

  const removeKnowledgeCategory = (id: string) => {
    update({
      knowledge_category_ids: draft.knowledge_category_ids.filter(
        (item) => item !== id,
      ),
    });
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
    <div className="rounded-3xl bg-white p-7 sm:p-8 shadow-sm">
      {!hideHeader && (
        <div className="mb-5 flex items-start justify-between">
          <h3 className="text-xl font-medium text-[#575757]">
            คำถามข้อ {index + 1}
          </h3>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#B7A3E3] text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
                aria-label="แก้ไข"
              >
                <Pencil size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#B7A3E3] text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
              aria-label="ลบ"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Question text */}
      {editing ? (
        <textarea
          value={draft.question_text}
          onChange={(e) => update({ question_text: e.target.value })}
          rows={6}
          placeholder="พิมพ์ข้อความคำถามที่นี่..."
          className="mb-6 w-full min-h-40 resize-y rounded-2xl bg-[#F4EFFF] px-5 py-4 text-base font-light leading-relaxed text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3]"
        />
      ) : (
        <p className="mb-6 whitespace-pre-wrap text-base font-light leading-relaxed text-[#575757]">
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
                rows={2}
                placeholder={`ตัวเลือก ${i + 1}`}
                className="flex-1 min-h-16 rounded-xl bg-[#F4EFFF] px-4 py-3 text-base font-light leading-relaxed text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3]"
              />
            ) : (
              <span className="flex-1 text-base font-light text-[#575757]">
                {c.choice_text || `ตัวเลือก ${i + 1}`}
              </span>
            )}
            {editing && fixedChoiceCount == null && draft.choices.length > 2 && (
              <button
                type="button"
                onClick={() => removeChoice(i)}
                className="text-gray-400 hover:text-rose-500 cursor-pointer"
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
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#B7A3E3] px-4 py-2 text-sm font-medium text-white hover:bg-[#A48FD6] cursor-pointer"
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
            onChange={(v) => update({ difficulty_param: v })}
          />
        )}
        <NumberField
          label="อำนาจการจำแนก"
          value={draft.discrimination_param}
          editing={editing}
          onChange={(v) => update({ discrimination_param: v })}
        />
        <NumberField
          label="โอกาสการเดา"
          value={draft.guessing_param}
          editing={editing}
          onChange={(v) => update({ guessing_param: v })}
        />
      </div>

      {/* Tags */}
      <div className="mt-8">
        <label className="mb-2 block text-sm font-medium text-[#575757]">
          หมวดหมู่ความรู้
        </label>
        {editing && knowledgeDisplayMode === "badge" ? (
          <TagSelect
            options={tags}
            value={draft.knowledge_category_ids}
            onChange={(ids) => update({ knowledge_category_ids: ids })}
          />
        ) : (
          <>
            {selectedKnowledgeTags.length === 0 ? (
              <span className="text-sm text-gray-400">-</span>
            ) : (
              <ul className="space-y-2">
                {selectedKnowledgeTags.map((t) => (
                  <li
                    key={t.knowledge_category_id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#F4EFFF] px-4 py-2.5 text-sm text-[#575757]"
                  >
                    <span>{t.name}</span>
                    {editing && knowledgeDisplayMode === "list" && (
                      <button
                        type="button"
                        onClick={() => removeKnowledgeCategory(t.knowledge_category_id)}
                        className="text-gray-400 hover:text-rose-500 cursor-pointer"
                        aria-label={`ลบ ${t.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {editing && knowledgeDisplayMode === "list" && (
              <div className="mt-3 space-y-2">
                {!showAddKnowledgeDropdown ? (
                  <button
                    type="button"
                    onClick={() => setShowAddKnowledgeDropdown(true)}
                    disabled={availableKnowledgeTags.length === 0}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${
                      availableKnowledgeTags.length > 0
                        ? "bg-[#B7A3E3] text-white hover:bg-[#A48FD6] cursor-pointer"
                        : "bg-[#B7A3E3] text-white opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <Plus size={16} /> เพิ่มหมวดหมู่ความรู้
                  </button>
                ) : (
                  <select
                    value=""
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id) addKnowledgeCategory(id);
                      setShowAddKnowledgeDropdown(false);
                    }}
                    className="w-full rounded-xl bg-[#F4EFFF] px-4 py-3 text-base font-light text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3]"
                  >
                    <option value="">เลือกหมวดหมู่ความรู้</option>
                    {availableKnowledgeTags.map((t) => (
                      <option
                        key={t.knowledge_category_id}
                        value={t.knowledge_category_id}
                      >
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          {(() => {
            const reason = firstInvalidReason(draft, fixedChoiceCount);
            const valid = reason === null;
            return (
              <>
                {!valid && (
                  <span className="mr-2 text-sm font-light text-rose-500">
                    {reason}
                  </span>
                )}
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-[#B7A3E3] px-6 py-2.5 text-base font-medium text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmEdit}
                  disabled={!valid || saving}
                  aria-disabled={!valid || saving}
                  className={`rounded-xl px-6 py-2.5 text-base font-medium text-white ${
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
      <label className="mb-2 block text-sm font-medium text-[#575757]">
        {label}
      </label>
      {editing ? (
        <select
          value={typeof value === "number" ? String(value) : ""}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? "" : Number(raw));
          }}
          className="w-full rounded-xl bg-[#F4EFFF] px-4 py-3 text-base font-light text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3]"
        >
          <option value="">เลือกระดับความยาก</option>
          {options.map((op) => (
            <option key={op.label} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="w-full rounded-xl bg-gray-100 px-4 py-3 text-base font-light text-[#575757]">
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
}: {
  label: string;
  value: number | "";
  editing: boolean;
  onChange: (v: number | "") => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#575757]">
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
        className="w-full rounded-xl bg-[#F4EFFF] px-4 py-3 text-base font-light text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3] read-only:bg-gray-100"
      />
    </div>
  );
}
