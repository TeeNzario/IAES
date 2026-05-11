export const FIELD_LIMITS = {
  courseCode: 50,
  courseName: 255,
  knowledgeCategoryName: 255,
  examTitle: 255,
  examDescription: 5000,
  questionText: 5000,
  choiceText: 2000,
  collectionTitle: 255,
  collectionDescription: 2000,
  email: 255,
  studentCode: 50,
  title: 50,
  firstName: 100,
  lastName: 100,
  curriculumId: 20,
} as const;

export function maxLengthMessage(label: string, max: number) {
  return `${label}ต้องไม่เกิน ${max} ตัวอักษร`;
}
