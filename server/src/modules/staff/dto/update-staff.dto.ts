import { IsString, IsOptional, IsBoolean, MaxLength, IsInt } from 'class-validator';

export class UpdateStaffDto {
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

  // Note: role is intentionally excluded - cannot be changed after creation
}
