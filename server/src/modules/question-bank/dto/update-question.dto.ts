import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateChoiceDto, QuestionTypeDto } from './create-question.dto';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LENGTHS.questionText, {
    message: maxLengthMessage('ข้อความคำถาม', FIELD_LENGTHS.questionText),
  })
  question_text?: string;

  @IsOptional()
  @IsEnum(QuestionTypeDto)
  question_type?: QuestionTypeDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateChoiceDto)
  choices?: CreateChoiceDto[];

  @IsOptional()
  @IsNumber()
  difficulty_param?: number;

  @IsOptional()
  @IsNumber()
  discrimination_param?: number;

  @IsOptional()
  @IsNumber()
  guessing_param?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  knowledge_category_ids?: string[];
}
