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

export class CreateExamDto {
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

  /** ISO-8601 datetime strings; service converts to Date and validates range. */
  @IsISO8601()
  start_time!: string;

  @IsISO8601()
  end_time!: string;

  @IsOptional()
  @IsBoolean()
  show_results_immediately?: boolean;

  /** question_bank.question_id values. All must belong to this course. */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(MIN_ADAPTIVE_ITEM_BANK_SIZE)
  @IsString({ each: true })
  question_ids!: string[];
}
