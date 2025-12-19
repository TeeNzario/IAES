import { apiFetch } from '@/lib/api';
import { Student } from '@/types/student';

export function fetchStudents() {
  return apiFetch<Student[]>('/students');
}
