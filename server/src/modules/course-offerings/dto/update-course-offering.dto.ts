import { IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class UpdateCourseOfferingDto {
  @IsOptional()
  @IsNumber()
  academic_year?: number;

  @IsOptional()
  @IsNumber()
  semester?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  instructor_ids?: number[];
}
