/**
 * The editor writes MCQ_SINGLE for new/edited questions. MCQ_MULTI remains
 * readable for legacy/demo questions and exam preview validation.
 */
export type QuestionType = "MCQ_SINGLE" | "MCQ_MULTI";

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
 * Display rule:
 *   difficulty <= -0.5  → "ง่าย"
 *   difficulty >=  0.5  → "ยาก"
 *   otherwise           → "กลาง"
 */
export function difficultyLabel(value: number | null | undefined): {
  label: string;
  className: string;
} {
  if (value === null || value === undefined) {
    return { label: "-", className: "bg-gray-200 text-gray-500" };
  }
  if (value <= -0.5)
    return { label: "ง่าย", className: "bg-emerald-100 text-emerald-700" };
  if (value >= 0.5)
    return { label: "ยาก", className: "bg-rose-100 text-rose-700" };
  return { label: "กลาง", className: "bg-amber-100 text-amber-700" };
}
