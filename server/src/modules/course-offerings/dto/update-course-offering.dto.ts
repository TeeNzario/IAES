import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsBoolean, IsArray, IsNumber, Max, Min } from 'class-validator';

export class UpdateCourseOfferingDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  academic_year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  semester?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  instructor_ids?: number[];
}
