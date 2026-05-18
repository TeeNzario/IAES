import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCourseOfferingDto {
  @IsString()
  @IsNotEmpty()
  courses_id: string;

  @IsInt()
  @IsOptional()
  academic_year?: number;

  @IsInt()
  @IsOptional()
  semester?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsArray()
  @IsOptional()
  instructor_ids?: number[];
}
