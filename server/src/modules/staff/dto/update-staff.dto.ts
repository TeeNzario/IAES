import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  Matches,
  MaxLength,
  MinLength,
  IsInt,
  ValidateIf,
} from 'class-validator';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';
import {
  IsCanonicalCurriculumId,
  IsKnownFacultyCode,
} from 'src/lib/academic-program-validation';

export class UpdateStaffDto {
  @ValidateIf((o) => o.email != null && o.email !== '')
  @IsEmail()
  @Matches(/^[^\s@]+@wu\.ac\.th$/, {
    message: 'อีเมลต้องเป็น @wu.ac.th เท่านั้น',
  })
  @MaxLength(FIELD_LENGTHS.email, {
    message: maxLengthMessage('อีเมล', FIELD_LENGTHS.email),
  })
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[ก-๙\s]+$/, { message: 'ชื่อต้องเป็นภาษาไทยเท่านั้น' })
  @MaxLength(FIELD_LENGTHS.firstName, {
    message: maxLengthMessage('ชื่อ', FIELD_LENGTHS.firstName),
  })
  first_name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[ก-๙\s]+$/, { message: 'นามสกุลต้องเป็นภาษาไทยเท่านั้น' })
  @MaxLength(FIELD_LENGTHS.lastName, {
    message: maxLengthMessage('นามสกุล', FIELD_LENGTHS.lastName),
  })
  last_name?: string;

  @IsInt()
  @IsOptional()
  @IsKnownFacultyCode({
    message: 'รหัสสำนักวิชาไม่ถูกต้อง กรุณาใช้รหัส 1-18',
  })
  facultyCode?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(FIELD_LENGTHS.title, {
    message: maxLengthMessage('คำนำหน้า', FIELD_LENGTHS.title),
  })
  title?: string;

  @IsString()
  @IsOptional()
  @IsCanonicalCurriculumId({
    message: 'รหัสหลักสูตรไม่ถูกต้อง กรุณาใช้รหัส CUR001-CUR069',
  })
  @MaxLength(FIELD_LENGTHS.curriculumId, {
    message: maxLengthMessage('รหัสหลักสูตร', FIELD_LENGTHS.curriculumId),
  })
  curriculumId?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  // Note: role is intentionally excluded - cannot be changed after creation
}
