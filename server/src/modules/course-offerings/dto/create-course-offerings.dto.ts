import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @IsArray()
  @IsOptional()
  instructor_ids?: number[];
}
