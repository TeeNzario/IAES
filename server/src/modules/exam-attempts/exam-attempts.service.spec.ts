import {
  clampTheta,
  correctnessDelta,
  pickNextQuestion,
} from './adaptive/adaptive-selector';
import {
  computePercentScore,
  isExactChoiceSelectionCorrect,
} from './scoring/scoring-engine';

describe('ExamAttemptsService adaptive helpers', () => {
  const questions = [
    {
      question_id: 1n,
      sequence_index: 0,
      difficulty_param: -1,
      discrimination_param: 0.7,
      guessing_param: 0.25,
    },
    {
      question_id: 2n,
      sequence_index: 1,
      difficulty_param: 0,
      discrimination_param: 0.5,
      guessing_param: 0.2,
    },
    {
      question_id: 3n,
      sequence_index: 2,
      difficulty_param: 0,
      discrimination_param: 1.2,
      guessing_param: 0.1,
    },
    {
      question_id: 4n,
      sequence_index: 3,
      difficulty_param: 1,
      discrimination_param: 1,
      guessing_param: 0.15,
    },
  ];

  it('selects the closest unshown question and breaks ties by discrimination', () => {
    const next = pickNextQuestion(questions, new Set(), 0);

    expect(next?.question_id).toBe(3n);
  });

  it('skips questions that were already shown', () => {
    const next = pickNextQuestion(questions, new Set(['3']), 0);

    expect(next?.question_id).toBe(2n);
  });

  it('updates theta in fixed steps and clamps the range', () => {
    expect(correctnessDelta(true)).toBe(0.35);
    expect(correctnessDelta(false)).toBe(-0.35);
    expect(clampTheta(4)).toBe(3);
    expect(clampTheta(-4)).toBe(-3);
  });

  it('scores unanswered questions as incorrect through the total denominator', () => {
    expect(computePercentScore(2, 4)).toBe(50);
    expect(computePercentScore(0, 0)).toBe(0);
  });

  it('scores multi-select choices by exact selected set', () => {
    expect(isExactChoiceSelectionCorrect(['1', '3'], ['3', '1'])).toBe(true);
    expect(isExactChoiceSelectionCorrect(['1', '3'], ['1'])).toBe(false);
    expect(isExactChoiceSelectionCorrect(['1', '3'], ['1', '2', '3'])).toBe(
      false,
    );
  });
});
