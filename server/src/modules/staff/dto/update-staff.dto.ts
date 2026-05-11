import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  MaxLength,
  MinLength,
  IsInt,
} from 'class-validator';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

export class UpdateStaffDto {
  @IsEmail()
  @IsOptional()
  @MaxLength(FIELD_LENGTHS.email, {
    message: maxLengthMessage('อีเมล', FIELD_LENGTHS.email),
  })
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(FIELD_LENGTHS.firstName, {
    message: maxLengthMessage('ชื่อ', FIELD_LENGTHS.firstName),
  })
  first_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(FIELD_LENGTHS.lastName, {
    message: maxLengthMessage('นามสกุล', FIELD_LENGTHS.lastName),
  })
  last_name?: string;

  @IsInt()
  @IsOptional()
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
