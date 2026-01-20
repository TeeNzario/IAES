export class CreateStudentDto {
  student_code: string;
  email: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
}
