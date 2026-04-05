import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsInt()
  @IsOptional()
  facultyCode?: number;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
