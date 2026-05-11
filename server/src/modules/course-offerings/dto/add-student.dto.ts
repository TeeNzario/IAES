// dto/add-student.dto.ts
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class AddStudentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลักเท่านั้น' })
  student_code: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/@mail\.wu\.ac\.th$/, { message: 'อีเมลต้องเป็น @mail.wu.ac.th เท่านั้น' })
  email: string;

  @IsInt()
  @IsNotEmpty()
  facultyCode: number;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  curriculumId?: string;
}
