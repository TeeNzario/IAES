export const THETA_STEP = 0.35;
export const THETA_MIN = -3;
export const THETA_MAX = 3;

export interface ExamQuestionCandidate {
  question_id: bigint;
  sequence_index: number;
  difficulty_param: number | null;
  discrimination_param: number | null;
  guessing_param: number | null;
}

export function clampTheta(value: number) {
  return Math.max(THETA_MIN, Math.min(THETA_MAX, value));
}

export function correctnessDelta(isCorrect: boolean) {
  return isCorrect ? THETA_STEP : -THETA_STEP;
}

export function pickNextQuestion(
  questions: ExamQuestionCandidate[],
  shownQuestionIds: Set<string>,
  theta: number,
) {
  return questions
    .filter((question) => !shownQuestionIds.has(question.question_id.toString()))
    .sort((a, b) => {
      const difficultyA = a.difficulty_param ?? 0;
      const difficultyB = b.difficulty_param ?? 0;
      const distance =
        Math.abs(difficultyA - theta) - Math.abs(difficultyB - theta);
      if (distance !== 0) return distance;

      const discrimination =
        (b.discrimination_param ?? Number.NEGATIVE_INFINITY) -
        (a.discrimination_param ?? Number.NEGATIVE_INFINITY);
      if (discrimination !== 0) return discrimination;

      return a.sequence_index - b.sequence_index;
    })[0];
}
