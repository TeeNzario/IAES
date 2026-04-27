import { IsInt, Max, Min } from 'class-validator';

export class CreateQuestionBankYearDto {
  @IsInt()
  @Min(2400)
  @Max(2700)
  academic_year!: number;
}
