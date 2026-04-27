import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateQuestionCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
