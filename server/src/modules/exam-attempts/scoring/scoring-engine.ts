export const PASSING_SCORE = 50;

export function computePercentScore(
  correctCount: number,
  totalQuestions: number,
) {
  if (totalQuestions <= 0) return 0;
  return (correctCount / totalQuestions) * 100;
}

export function didPass(totalScore: number) {
  return totalScore >= PASSING_SCORE;
}

export function isExactChoiceSelectionCorrect(
  correctChoiceIds: Iterable<string>,
  selectedChoiceIds: Iterable<string>,
) {
  const correct = new Set(correctChoiceIds);
  const selected = new Set(selectedChoiceIds);

  if (correct.size !== selected.size) return false;
  for (const id of correct) {
    if (!selected.has(id)) return false;
  }
  return true;
}
