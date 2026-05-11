import { Type } from 'class-transformer';
import {
  IsInt,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลักเท่านั้น' })
  @MaxLength(FIELD_LENGTHS.studentCode, {
    message: maxLengthMessage('รหัสนักศึกษา', FIELD_LENGTHS.studentCode),
  })
  student_code: string;

  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  @IsNotEmpty()
  @MaxLength(FIELD_LENGTHS.email, {
    message: maxLengthMessage('อีเมล', FIELD_LENGTHS.email),
  })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  facultyCode: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(FIELD_LENGTHS.firstName, {
    message: maxLengthMessage('ชื่อ', FIELD_LENGTHS.firstName),
  })
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(FIELD_LENGTHS.lastName, {
    message: maxLengthMessage('นามสกุล', FIELD_LENGTHS.lastName),
  })
  last_name: string;

  @IsString()
  @IsOptional()
  @MaxLength(FIELD_LENGTHS.title, {
    message: maxLengthMessage('คำนำหน้า', FIELD_LENGTHS.title),
  })
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(FIELD_LENGTHS.curriculumId, {
    message: maxLengthMessage('รหัสหลักสูตร', FIELD_LENGTHS.curriculumId),
  })
  curriculumId?: string;
}
