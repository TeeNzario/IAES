export const QUESTION_PARAM_LIMITS = {
  difficulty: {
    min: -3,
    max: 3,
  },
  discrimination: {
    min: 0,
    max: 3,
  },
  guessing: {
    min: 0,
    max: 1,
  },
} as const;

export type QuestionParamKey = keyof typeof QUESTION_PARAM_LIMITS;

export const QUESTION_PARAM_LABELS: Record<QuestionParamKey, string> = {
  difficulty: "ความยาก",
  discrimination: "อำนาจการจำแนก",
  guessing: "โอกาสการเดา",
};

export function questionParamRangeMessage(param: QuestionParamKey) {
  const { min, max } = QUESTION_PARAM_LIMITS[param];
  return `${QUESTION_PARAM_LABELS[param]}ต้องอยู่ระหว่าง ${min} ถึง ${max}`;
}
