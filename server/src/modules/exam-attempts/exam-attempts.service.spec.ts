import {
  adaptiveRules,
  clampTheta,
  evaluateStopRule,
  fisherInformation,
  pickNextQuestion,
  probability3pl,
  updateTheta,
} from './adaptive/adaptive-selector';
import type { AnsweredQuestionCandidate } from './adaptive/adaptive-selector';
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
    expect(adaptiveRules(8)).toMatchObject({ minItems: 8, maxItems: 8 });
    expect(adaptiveRules(30)).toMatchObject({ minItems: 9, maxItems: 30 });
    expect(adaptiveRules(59)).toMatchObject({ minItems: 14, maxItems: 59 });
  });

  it('matches the test-irt.py CAT path for a perfect scorer', () => {
    const mockItems = [
      ['E1', 0.85, -2.9],
      ['E2', 0.9, -2.65],
      ['E3', 0.95, -2.4],
      ['E4', 1, -2.2],
      ['E5', 1.05, -2],
      ['E6', 1.1, -1.8],
      ['E7', 1.15, -1.6],
      ['E8', 1.2, -1.4],
      ['E9', 1.25, -1.2],
      ['E10', 1.3, -1],
      ['M1', 1.8, -0.9],
      ['M2', 1.95, -0.7],
      ['M3', 2.1, -0.5],
      ['M4', 2.25, -0.3],
      ['M5', 2.4, -0.1],
      ['M6', 2.4, 0.1],
      ['M7', 2.25, 0.3],
      ['M8', 2.1, 0.5],
      ['M9', 1.95, 0.7],
      ['M10', 1.8, 0.9],
      ['H1', 1.7, 1],
      ['H2', 1.75, 1.2],
      ['H3', 1.8, 1.4],
      ['H4', 1.85, 1.6],
      ['H5', 1.9, 1.8],
      ['H6', 1.9, 2],
      ['H7', 1.85, 2.2],
      ['H8', 1.8, 2.4],
      ['H9', 1.75, 2.7],
      ['H10', 1.7, 3],
    ] as const;
    const idByQuestionId = new Map<string, string>();
    const itemBank = mockItems.map(([id, a, b], index) => {
      const questionId = BigInt(index + 1);
      idByQuestionId.set(questionId.toString(), id);
      return {
        question_id: questionId,
        sequence_index: index,
        discrimination_param: a,
        difficulty_param: b,
        guessing_param: 0.25,
      };
    });
    let theta = 0;
    let standardError: number | null = null;
    let previousStandardError = Number.POSITIVE_INFINITY;
    let worseningStreak = 0;
    const answered: AnsweredQuestionCandidate[] = [];
    const shown = new Set<string>();
    const sequence: string[] = [];

    for (let step = 0; step < 20; step++) {
      const next = pickNextQuestion(itemBank, shown, theta);
      expect(next).toBeDefined();
      if (!next) break;
      shown.add(next.question_id.toString());
      sequence.push(idByQuestionId.get(next.question_id.toString()) ?? '');

      const previousTheta = theta;
      answered.push({ ...next, is_correct: true });
      const result = updateTheta(theta, answered);
      theta = result.theta;
      standardError = result.standardError;

      if (standardError !== null && standardError > previousStandardError) {
        worseningStreak++;
      } else {
        worseningStreak = 0;
      }
      previousStandardError = standardError ?? previousStandardError;

      const stop = evaluateStopRule({
        answeredCount: answered.length,
        totalItems: itemBank.length,
        theta,
        standardError,
        thetaChange: Math.abs(theta - previousTheta),
        worseningStreak,
      });

      if (stop.shouldStop) break;
    }

    expect(sequence).toEqual([
      'M5',
      'M6',
      'M7',
      'M8',
      'M9',
      'H3',
      'H4',
      'H5',
      'H6',
      'H8',
      'H9',
      'H10',
      'H7',
    ]);
    expect(answered).toHaveLength(13);
    expect(theta).toBe(4);
    expect(standardError).toBeCloseTo(1.1024, 4);
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
