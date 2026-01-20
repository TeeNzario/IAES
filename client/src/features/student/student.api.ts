import { apiFetch } from '@/lib/api';
import { StudentDto } from '@/types/student';

export function fetchStudents() {
  return apiFetch<StudentDto[]>('/students');
}

export function updateStudent(id: string, data: Partial<StudentDto>) {
  return apiFetch<StudentDto>(`/students/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
