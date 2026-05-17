import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SaveAnswerDto {
  @IsOptional()
  @IsString()
  selected_choice_id?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  selected_choice_ids?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  answer_text?: string;
}
