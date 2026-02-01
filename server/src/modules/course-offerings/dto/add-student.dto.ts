// dto/add-student.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AddStudentDto {
  @IsString()
  @IsNotEmpty()
  student_code: string;

  @IsEmail()
  email: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;
}
