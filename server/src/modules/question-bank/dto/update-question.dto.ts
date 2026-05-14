import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateChoiceDto, QuestionTypeDto } from './create-question.dto';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';
import {
  QUESTION_PARAM_LIMITS,
  questionParamRangeMessage,
} from 'src/lib/question-param-limits';

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
  @Min(QUESTION_PARAM_LIMITS.difficulty.min, {
    message: questionParamRangeMessage('difficulty'),
  })
  @Max(QUESTION_PARAM_LIMITS.difficulty.max, {
    message: questionParamRangeMessage('difficulty'),
  })
  difficulty_param?: number;

  @IsOptional()
  @IsNumber()
  @Min(QUESTION_PARAM_LIMITS.discrimination.min, {
    message: questionParamRangeMessage('discrimination'),
  })
  @Max(QUESTION_PARAM_LIMITS.discrimination.max, {
    message: questionParamRangeMessage('discrimination'),
  })
  discrimination_param?: number;

  @IsOptional()
  @IsNumber()
  @Min(QUESTION_PARAM_LIMITS.guessing.min, {
    message: questionParamRangeMessage('guessing'),
  })
  @Max(QUESTION_PARAM_LIMITS.guessing.max, {
    message: questionParamRangeMessage('guessing'),
  })
  guessing_param?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  knowledge_category_ids?: string[];
}
