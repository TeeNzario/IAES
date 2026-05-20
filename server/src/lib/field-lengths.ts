export const FIELD_LENGTHS = {
  courseCode: 15,
  courseName: 150,
  knowledgeCategoryName: 255,
  knowledgeCategoryCode: 30,
  examTitle: 255,
  examDescription: 5000,
  questionText: 5000,
  choiceText: 2000,
  collectionTitle: 255,
  collectionDescription: 2000,
  email: 100,
  studentCode: 50,
  title: 50,
  firstName: 100,
  lastName: 100,
  curriculumId: 20,
} as const;

export function maxLengthMessage(label: string, max: number) {
  return `${label}ต้องไม่เกิน ${max} ตัวอักษร`;
}
