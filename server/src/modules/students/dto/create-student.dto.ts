import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  student_code: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  password_hash?: string;

  @IsInt()
  @IsNotEmpty()
  facultyCode: number;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;
}
