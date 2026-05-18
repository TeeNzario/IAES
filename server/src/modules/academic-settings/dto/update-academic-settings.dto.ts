import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export class UpdateAcademicSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  academic_year!: number;

  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3])
  semester!: number;
}
