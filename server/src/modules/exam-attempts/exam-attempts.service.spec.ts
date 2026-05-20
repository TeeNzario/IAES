import {
  adaptiveRules,
  clampTheta,
  evaluateStopRule,
  fisherInformation,
  pickNextQuestion,
  probability3pl,
  updateTheta,
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
      discrimination_param: 0.9,
      guessing_param: 0.25,
    },
    {
      question_id: 2n,
      sequence_index: 1,
      difficulty_param: 0,
      discrimination_param: 1.1,
      guessing_param: 0.25,
    },
    {
      question_id: 3n,
      sequence_index: 2,
      difficulty_param: 0.6,
      discrimination_param: 2.2,
      guessing_param: 0.25,
    },
    {
      question_id: 4n,
      sequence_index: 3,
      difficulty_param: 1,
      discrimination_param: 1.7,
      guessing_param: 0.25,
    },
  ];

  it('calculates 3PL probability and Fisher information', () => {
    const probability = probability3pl(0, 1.2, 0, 0.25);
    const information = fisherInformation(0, 1.2, 0, 0.25);

    expect(probability).toBeCloseTo(0.625, 3);
    expect(information).toBeGreaterThan(0);
  });

  it('selects the first question closest to b=0', () => {
    const next = pickNextQuestion(questions, new Set(), 0);

    expect(next?.question_id).toBe(2n);
  });

  it('selects the remaining question with the highest Fisher information', () => {
    const next = pickNextQuestion(questions, new Set(['2']), 0.6);

    expect(next?.question_id).toBe(3n);
  });

  it('updates theta with bounded Newton-Raphson steps and shrinkage', () => {
    const result = updateTheta(0, [
      { ...questions[1], is_correct: true },
      { ...questions[2], is_correct: true },
    ]);

    expect(result.theta).toBeGreaterThan(0);
    expect(result.appliedStep).toBeLessThanOrEqual(0.35);
    expect(clampTheta(4.5)).toBe(4);
    expect(clampTheta(-4.5)).toBe(-4);
  });

  it('derives adaptive min and max item counts from the item bank size', () => {
    expect(adaptiveRules(30)).toMatchObject({ minItems: 9, maxItems: 30 });
    expect(adaptiveRules(59)).toMatchObject({ minItems: 14, maxItems: 59 });
  });

  it('stops after the dynamic minimum when precision target is reached', () => {
    const stop = evaluateStopRule({
      answeredCount: 12,
      totalItems: 30,
      theta: 0.8,
      standardError: 0.3,
      thetaChange: 0.1,
      worseningStreak: 0,
    });

    expect(stop).toEqual({
      shouldStop: true,
      reason: 'standard_error_target',
    });
  });

  it('scores unanswered adaptive items through the administered denominator', () => {
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
