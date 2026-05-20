import { FIXED_GUESSING_PARAM } from 'src/lib/question-param-limits';

export const THETA_MIN = -4;
export const THETA_MAX = 4;
export const TARGET_STANDARD_ERROR = 0.35;
export const THETA_PLATEAU_THRESHOLD = 0.2;
export const STANDARD_ERROR_WORSENING_LIMIT = 2;
export const MIN_ADAPTIVE_ITEM_BANK_SIZE = 8;

const EXPONENT_MIN = -50;
const EXPONENT_MAX = 50;
const PROBABILITY_MAX = 0.999999;
const MIN_INFORMATION = 1e-6;

export interface ExamQuestionCandidate {
  question_id: bigint;
  sequence_index: number;
  difficulty_param: number | null;
  discrimination_param: number | null;
  guessing_param: number | null;
}

export interface AnsweredQuestionCandidate extends ExamQuestionCandidate {
  is_correct: boolean;
}

export interface ThetaUpdateResult {
  theta: number;
  previousTheta: number;
  score: number;
  testInformation: number;
  standardError: number | null;
  rawStep: number;
  appliedStep: number;
  shrinkageFactor: number;
}

export interface AdaptiveRules {
  minItems: number;
  maxItems: number;
  targetStandardError: number;
  thetaMin: number;
  thetaMax: number;
}

export type AdaptiveStopReason =
  | 'standard_error_target'
  | 'theta_extreme_high'
  | 'theta_extreme_low'
  | 'theta_plateau'
  | 'max_items'
  | 'item_bank_exhausted';

export interface AdaptiveStopResult {
  shouldStop: boolean;
  reason: AdaptiveStopReason | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function params(item: ExamQuestionCandidate) {
  return {
    a: isFiniteNumber(item.discrimination_param)
      ? item.discrimination_param
      : 0,
    b: isFiniteNumber(item.difficulty_param) ? item.difficulty_param : 0,
    c: isFiniteNumber(item.guessing_param)
      ? item.guessing_param
      : FIXED_GUESSING_PARAM,
  };
}

export function clampTheta(value: number) {
  return clamp(value, THETA_MIN, THETA_MAX);
}

export function probability3pl(theta: number, a: number, b: number, c: number) {
  const exponent = clamp(-a * (theta - b), EXPONENT_MIN, EXPONENT_MAX);
  const logistic = 1 / (1 + Math.exp(exponent));
  return c + (1 - c) * logistic;
}

export function fisherInformation(
  theta: number,
  a: number,
  b: number,
  c: number,
) {
  const p = probability3pl(theta, a, b, c);

  if (p <= c || p >= PROBABILITY_MAX || c >= 1) {
    return 0;
  }

  const term1 = a ** 2;
  const term2 = ((p - c) / (1 - c)) ** 2;
  const term3 = (1 - p) / p;

  return term1 * term2 * term3;
}

export function itemInformation(theta: number, item: ExamQuestionCandidate) {
  const { a, b, c } = params(item);
  return fisherInformation(theta, a, b, c);
}

export function scoreFunction(
  theta: number,
  answeredItems: AnsweredQuestionCandidate[],
) {
  return answeredItems.reduce((score, item) => {
    const { a, b, c } = params(item);
    const p = probability3pl(theta, a, b, c);
    const exponent = clamp(-a * (theta - b), EXPONENT_MIN, EXPONENT_MAX);
    const logistic = 1 / (1 + Math.exp(exponent));
    const pPrime = (1 - c) * a * logistic * (1 - logistic);
    const denominator = p * (1 - p);

    if (denominator <= 1e-10) {
      return score;
    }

    return score + (pPrime * ((item.is_correct ? 1 : 0) - p)) / denominator;
  }, 0);
}

export function testInformation(
  theta: number,
  administeredItems: ExamQuestionCandidate[],
) {
  return administeredItems.reduce(
    (sum, item) => sum + itemInformation(theta, item),
    0,
  );
}

export function standardErrorFromInformation(information: number) {
  return information > 0 ? 1 / Math.sqrt(information) : null;
}

export function updateTheta(
  thetaOld: number,
  answeredItems: AnsweredQuestionCandidate[],
): ThetaUpdateResult {
  const score = scoreFunction(thetaOld, answeredItems);
  const information = testInformation(thetaOld, answeredItems);

  if (information <= MIN_INFORMATION) {
    return {
      theta: clampTheta(thetaOld),
      previousTheta: thetaOld,
      score,
      testInformation: information,
      standardError: standardErrorFromInformation(information),
      rawStep: 0,
      appliedStep: 0,
      shrinkageFactor: 1,
    };
  }

  const rawStep = score / information;
  const numItems = answeredItems.length;
  const maxStep = numItems <= 5 ? 0.35 : numItems <= 10 ? 0.45 : 0.5;
  const appliedStep = clamp(rawStep, -maxStep, maxStep);
  const shrinkageFactor = numItems < 8 ? 0.92 : 0.97;
  const theta = clampTheta((thetaOld + appliedStep) * shrinkageFactor);
  const nextInformation = testInformation(theta, answeredItems);

  return {
    theta,
    previousTheta: thetaOld,
    score,
    testInformation: nextInformation,
    standardError: standardErrorFromInformation(nextInformation),
    rawStep,
    appliedStep,
    shrinkageFactor,
  };
}

export function adaptiveRules(totalItems: number): AdaptiveRules {
  let minItems: number;

  if (totalItems <= 30) {
    minItems = Math.max(
      MIN_ADAPTIVE_ITEM_BANK_SIZE,
      Math.floor(totalItems * 0.3),
    );
  } else if (totalItems <= 60) {
    minItems = Math.max(12, Math.floor(totalItems * 0.25));
  } else {
    minItems = Math.max(15, Math.floor(totalItems * 0.2));
  }

  return {
    minItems,
    maxItems: totalItems,
    targetStandardError: TARGET_STANDARD_ERROR,
    thetaMin: THETA_MIN,
    thetaMax: THETA_MAX,
  };
}

export function evaluateStopRule({
  answeredCount,
  totalItems,
  theta,
  standardError,
  thetaChange,
  worseningStreak,
}: {
  answeredCount: number;
  totalItems: number;
  theta: number;
  standardError: number | null;
  thetaChange: number;
  worseningStreak: number;
}): AdaptiveStopResult {
  const rules = adaptiveRules(totalItems);

  if (answeredCount < rules.minItems) {
    return { shouldStop: false, reason: null };
  }

  if (standardError !== null && standardError <= rules.targetStandardError) {
    return { shouldStop: true, reason: 'standard_error_target' };
  }
  if (theta >= rules.thetaMax) {
    return { shouldStop: true, reason: 'theta_extreme_high' };
  }
  if (theta <= rules.thetaMin) {
    return { shouldStop: true, reason: 'theta_extreme_low' };
  }
  if (
    worseningStreak >= STANDARD_ERROR_WORSENING_LIMIT &&
    thetaChange < THETA_PLATEAU_THRESHOLD
  ) {
    return { shouldStop: true, reason: 'theta_plateau' };
  }
  if (answeredCount >= rules.maxItems) {
    return { shouldStop: true, reason: 'max_items' };
  }

  return { shouldStop: false, reason: null };
}

export function pickNextQuestion(
  questions: ExamQuestionCandidate[],
  shownQuestionIds: Set<string>,
  theta: number,
) {
  const remaining = questions.filter(
    (question) => !shownQuestionIds.has(question.question_id.toString()),
  );

  if (remaining.length === 0) return undefined;

  if (shownQuestionIds.size === 0) {
    return remaining.sort((a, b) => {
      const difficultyDistance =
        Math.abs((a.difficulty_param ?? 0) - 0) -
        Math.abs((b.difficulty_param ?? 0) - 0);
      if (difficultyDistance !== 0) return difficultyDistance;

      return a.sequence_index - b.sequence_index;
    })[0];
  }

  return remaining
    .map((question) => ({
      question,
      information: itemInformation(theta, question),
    }))
    .sort((a, b) => {
      const information = b.information - a.information;
      if (information !== 0) return information;

      const difficultyDistance =
        Math.abs((a.question.difficulty_param ?? 0) - theta) -
        Math.abs((b.question.difficulty_param ?? 0) - theta);
      if (difficultyDistance !== 0) return difficultyDistance;

      return a.question.sequence_index - b.question.sequence_index;
    })[0]?.question;
}
