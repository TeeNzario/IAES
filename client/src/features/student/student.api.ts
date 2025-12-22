import { apiFetch } from '@/lib/api';
import { StudentDto } from '@/types/student';

export function fetchStudents() {
  return apiFetch<StudentDto[]>('/students');
}
