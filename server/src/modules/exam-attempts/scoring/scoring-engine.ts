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
