/**
 * Only MCQ_SINGLE is supported by the editor. The enum in the DB still allows
 * MCQ_MULTI for legacy data, but new/edited questions are always single-correct.
 */
export type QuestionType = "MCQ_SINGLE";

export interface Choice {
  choice_id?: string;
  choice_text: string;
  is_correct: boolean;
  display_order?: number;
}

export interface QuestionTag {
  knowledge_category_id: string;
  name: string;
}

export interface Question {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  difficulty_param: number | null;
  discrimination_param: number | null;
  guessing_param: number | null;
  choices: Choice[];
  knowledge_categories: QuestionTag[];
}

/**
 * Display rule from the spec:
 *   difficulty < 0  → "ง่าย"
 *   difficulty = 0  → "กลาง"
 *   difficulty > 0  → "ยาก"
 */
export function difficultyLabel(value: number | null | undefined): {
  label: string;
  className: string;
} {
  if (value === null || value === undefined) {
    return { label: "-", className: "bg-gray-200 text-gray-500" };
  }
  if (value < 0)
    return { label: "ง่าย", className: "bg-emerald-100 text-emerald-700" };
  if (value === 0)
    return { label: "กลาง", className: "bg-amber-100 text-amber-700" };
  return { label: "ยาก", className: "bg-rose-100 text-rose-700" };
}
