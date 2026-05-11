import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

export enum QuestionTypeDto {
  MCQ_SINGLE = 'MCQ_SINGLE',
  MCQ_MULTI = 'MCQ_MULTI',
}

export class CreateChoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LENGTHS.choiceText, {
    message: maxLengthMessage('ข้อความตัวเลือก', FIELD_LENGTHS.choiceText),
  })
  choice_text!: string;

  @IsBoolean()
  is_correct!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}

export class CreateQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LENGTHS.questionText, {
    message: maxLengthMessage('ข้อความคำถาม', FIELD_LENGTHS.questionText),
  })
  question_text!: string;

  /**
   * Optional on input; the service always writes MCQ_SINGLE regardless of
   * what the client sends (spec: single-correct MCQ only).
   */
  @IsOptional()
  @IsEnum(QuestionTypeDto)
  question_type?: QuestionTypeDto;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateChoiceDto)
  choices!: CreateChoiceDto[];

  // IRT params are required at create time (per agreed spec).
  @IsNumber()
  difficulty_param!: number;

  @IsNumber()
  discrimination_param!: number;

  @IsNumber()
  guessing_param!: number;

  /** Tag ids (knowledge_category_id). Must all be linked to the course. */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  knowledge_category_ids!: string[];
}

export class BulkCreateQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @IsNotEmpty()
  questions!: CreateQuestionDto[];
}
