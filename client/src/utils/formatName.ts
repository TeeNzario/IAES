import { Instructor } from "@/types/staff";

// Helper to format instructor name
export function formatName(instructor: Instructor): string {
  return `${instructor.first_name} ${instructor.last_name}`;
}
