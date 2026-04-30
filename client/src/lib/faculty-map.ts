export const FACULTY_MAP: Record<number, string> = {
  1: "วิศวกรรมศาสตร์",
  2: "วิทยาศาสตร์",
  3: "บริหารธุรกิจ",
};

export function getFacultyName(code: number): string {
  return FACULTY_MAP[code] ?? "ไม่ทราบคณะ";
}
