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

export class CreateExamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /** ISO-8601 datetime strings; service converts to Date and validates range. */
  @IsISO8601()
  start_time!: string;

  @IsISO8601()
  end_time!: string;

  @IsBoolean()
  show_results_immediately!: boolean;

  /** question_bank.question_id values. All must belong to this course. */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  question_ids!: string[];
}
