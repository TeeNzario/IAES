import { apiFetch } from "@/lib/api";
import { toBuddhistYear } from "@/utils/academicYear";

export interface AcademicSettings {
  id: number;
  academic_year: number;
  semester: number;
  updated_by_staff_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateAcademicSettingsPayload {
  academic_year: number;
  semester: number;
}

export const getCurrentAcademicSettings = () =>
  apiFetch<AcademicSettings>("/academic-settings/current");

export const updateCurrentAcademicSettings = (
  payload: UpdateAcademicSettingsPayload,
) =>
  apiFetch<AcademicSettings>("/academic-settings/current", {
    method: "PATCH",
    data: payload,
  });

export function buildAcademicYearOptions(...years: Array<number | undefined>) {
  const baseYear =
    years.find((year) => Number.isInteger(year)) ?? new Date().getFullYear();
  const optionSet = new Set<number>([
    baseYear - 1,
    baseYear,
    baseYear + 1,
    ...years.filter((year): year is number => Number.isInteger(year)),
  ]);

  return Array.from(optionSet).sort((a, b) => a - b);
}

export function formatAcademicTerm(settings: AcademicSettings | null) {
  if (!settings) return "-";
  return `${toBuddhistYear(settings.academic_year)} / ${settings.semester}`;
}
