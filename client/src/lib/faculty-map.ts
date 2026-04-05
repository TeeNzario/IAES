export const FACULTY_MAP: Record<number, string> = {
  1: "คณะวิศวกรรมศาสตร์",
  2: "คณะวิทยาศาสตร์",
  3: "คณะบริหารธุรกิจ",
};

export function getFacultyName(code: number): string {
  return FACULTY_MAP[code] ?? "ไม่ทราบคณะ";
}
