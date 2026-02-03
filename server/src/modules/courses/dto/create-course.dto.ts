import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  course_name: string;

  @IsString()
  course_code: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  knowledge_categories?: string[];
}
