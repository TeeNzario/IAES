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

/**
 * Full-replace update payload. Same shape as CreateExamDto — the UI always
 * re-saves the entire exam so PATCH here is a complete overwrite (including
 * exam_questions which get wiped + re-inserted to preserve sequence_index).
 */
export class UpdateExamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsISO8601()
  start_time!: string;

  @IsISO8601()
  end_time!: string;

  @IsBoolean()
  show_results_immediately!: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  question_ids!: string[];
}
