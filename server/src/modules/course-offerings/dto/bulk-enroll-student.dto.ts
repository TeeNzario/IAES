import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

export class BulkEnrollStudentRowDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลักเท่านั้น' })
  student_code: string;

  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  @Matches(/@mail\.wu\.ac\.th$/, { message: 'อีเมลต้องเป็น @mail.wu.ac.th เท่านั้น' })
  @MaxLength(FIELD_LENGTHS.email, {
    message: maxLengthMessage('อีเมล', FIELD_LENGTHS.email),
  })
  email: string;

  @IsInt()
  @IsNotEmpty()
  facultyCode: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[ก-๙\s]+$/, { message: 'ชื่อต้องเป็นภาษาไทยเท่านั้น' })
  @MaxLength(FIELD_LENGTHS.firstName, {
    message: maxLengthMessage('ชื่อ', FIELD_LENGTHS.firstName),
  })
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[ก-๙\s]+$/, { message: 'นามสกุลต้องเป็นภาษาไทยเท่านั้น' })
  @MaxLength(FIELD_LENGTHS.lastName, {
    message: maxLengthMessage('นามสกุล', FIELD_LENGTHS.lastName),
  })
  last_name: string;

  @IsBoolean()
  @IsOptional()
  allowOverwrite?: boolean;

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

export class BulkEnrollStudentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEnrollStudentRowDto)
  students: BulkEnrollStudentRowDto[];
}

// Result types for response
export interface BulkEnrollRowResult {
  student_code: string;
  email: string;
  enrollmentStatus: 'enrolled' | 'already_enrolled' | 'failed';
  directoryAction: 'created' | 'updated' | 'unchanged';
  note?: string;
}

export interface BulkEnrollResponse {
  results: BulkEnrollRowResult[];
  summary: {
    total: number;
    enrolled: number;
    alreadyEnrolled: number;
    failed: number;
  };
}
