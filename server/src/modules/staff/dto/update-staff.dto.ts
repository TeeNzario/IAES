import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  MaxLength,
  MinLength,
  IsInt,
} from 'class-validator';

export class UpdateStaffDto {
  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  first_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  last_name?: string;

  @IsInt()
  @IsOptional()
  facultyCode?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  title?: string;

  @IsString()
  @IsOptional()
  curriculumId?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  // Note: role is intentionally excluded - cannot be changed after creation
}
