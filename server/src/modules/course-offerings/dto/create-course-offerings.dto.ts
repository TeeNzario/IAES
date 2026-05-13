import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCourseOfferingDto {
  @IsString()
  @IsNotEmpty()
  courses_id: string;

  @IsInt()
  @IsNotEmpty()
  academic_year: number;

  @IsInt()
  @IsNotEmpty()
  semester: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsArray()
  @IsOptional()
  instructor_ids?: number[];
}
