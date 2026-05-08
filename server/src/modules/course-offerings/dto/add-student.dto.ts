// dto/add-student.dto.ts
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddStudentDto {
  @IsString()
  @IsNotEmpty()
  student_code: string;

  @IsEmail()
  email: string;

  @IsInt()
  @IsNotEmpty()
  facultyCode: number;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  curriculumId?: string;
}
