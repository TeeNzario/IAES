export const QUESTION_PARAM_LIMITS = {
  difficulty: {
    min: -3,
    max: 3,
  },
  discrimination: {
    min: 0.5,
    max: 2.5,
  },
  guessing: {
    min: 0.25,
    max: 0.25,
    fixed: 0.25,
  },
} as const;

export type QuestionParamKey = keyof typeof QUESTION_PARAM_LIMITS;
export const FIXED_GUESSING_PARAM = QUESTION_PARAM_LIMITS.guessing.fixed;

export const QUESTION_PARAM_LABELS: Record<QuestionParamKey, string> = {
  difficulty: 'ความยาก',
  discrimination: 'อำนาจการจำแนก',
  guessing: 'โอกาสการเดา',
};

export function questionParamRangeMessage(param: QuestionParamKey) {
  const { min, max } = QUESTION_PARAM_LIMITS[param];
  if (min === max) {
    return `${QUESTION_PARAM_LABELS[param]} ต้องเป็น ${min}`;
  }
  return `${QUESTION_PARAM_LABELS[param]} ต้องอยู่ระหว่าง ${min} ถึง ${max}`;
}
