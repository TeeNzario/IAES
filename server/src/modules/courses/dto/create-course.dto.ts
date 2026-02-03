import { IsString, IsOptional, IsArray, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  course_name: string;

  @IsString()
  @IsNotEmpty()
  course_code: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  knowledge_categories?: string[];
}
