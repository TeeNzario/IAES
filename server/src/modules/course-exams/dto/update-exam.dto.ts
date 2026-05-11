import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

/**
 * Full-replace update payload. Same shape as CreateExamDto — the UI always
 * re-saves the entire exam so PATCH here is a complete overwrite (including
 * exam_questions which get wiped + re-inserted to preserve sequence_index).
 */
export class UpdateExamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LENGTHS.examTitle, {
    message: maxLengthMessage('ชื่อชุดข้อสอบ', FIELD_LENGTHS.examTitle),
  })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LENGTHS.examDescription, {
    message: maxLengthMessage('คำอธิบายชุดข้อสอบ', FIELD_LENGTHS.examDescription),
  })
  description?: string;

  @IsISO8601()
  start_time!: string;

  @IsISO8601()
  end_time!: string;

  @IsOptional()
  @IsBoolean()
  show_results_immediately?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  question_ids!: string[];
}
