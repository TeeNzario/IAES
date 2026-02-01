import { Instructor } from "@/types/staff";

// Helper to format instructor name
export function formatInstructorName(instructor: Instructor): string {
  return `${instructor.first_name} ${instructor.last_name}`;
}
