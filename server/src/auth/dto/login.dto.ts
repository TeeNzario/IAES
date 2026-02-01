import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for Student Login
 * POST /auth/student/login
 */
export class StudentLoginDto {
  @IsString()
  @IsNotEmpty()
  student_code: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * DTO for Staff Login (INSTRUCTOR / ADMIN)
 * POST /auth/staff/login
 */
export class StaffLoginDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
