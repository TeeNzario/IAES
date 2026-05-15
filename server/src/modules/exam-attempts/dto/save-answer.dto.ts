import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveAnswerDto {
  @IsOptional()
  @IsString()
  selected_choice_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  answer_text?: string;
}
