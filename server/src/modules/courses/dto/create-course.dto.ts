import { IsString, IsOptional, IsArray, MaxLength, IsNotEmpty } from 'class-validator';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

export class CreateCourseDto {
  @IsString()
  @IsOptional()
  @MaxLength(FIELD_LENGTHS.courseName, {
    message: maxLengthMessage('ชื่อรายวิชา', FIELD_LENGTHS.courseName),
  })
  course_name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(FIELD_LENGTHS.courseName, {
    message: maxLengthMessage('ชื่อรายวิชา (ภาษาไทย)', FIELD_LENGTHS.courseName),
  })
  course_name_th: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(FIELD_LENGTHS.courseName, {
    message: maxLengthMessage(
      'ชื่อรายวิชา (ภาษาอังกฤษ)',
      FIELD_LENGTHS.courseName,
    ),
  })
  course_name_en: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(FIELD_LENGTHS.courseCode, {
    message: maxLengthMessage('รหัสวิชา', FIELD_LENGTHS.courseCode),
  })
  course_code: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(FIELD_LENGTHS.knowledgeCategoryName, {
    each: true,
    message: maxLengthMessage(
      'ชื่อหมวดหมู่ความรู้',
      FIELD_LENGTHS.knowledgeCategoryName,
    ),
  })
  knowledge_categories?: string[];
}
