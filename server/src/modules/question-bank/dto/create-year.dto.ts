import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateQuestionBankYearDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(2000)
  @Max(2200)
  academic_year?: number;
}
