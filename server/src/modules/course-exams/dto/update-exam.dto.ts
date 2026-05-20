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
import { MIN_ADAPTIVE_ITEM_BANK_SIZE } from 'src/modules/exam-attempts/adaptive/adaptive-selector';

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
    message: maxLengthMessage(
      'คำอธิบายชุดข้อสอบ',
      FIELD_LENGTHS.examDescription,
    ),
  })
  description?: string;

  @IsISO8601()
  start_time!: string;

  @IsISO8601()
  end_time!: string;

  @IsOptional()
  @IsBoolean()
  show_results_immediately?: boolean;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(MIN_ADAPTIVE_ITEM_BANK_SIZE)
  @IsString({ each: true })
  question_ids!: string[];
}
