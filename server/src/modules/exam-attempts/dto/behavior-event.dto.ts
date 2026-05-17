import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class BehaviorEventDto {
  @IsString()
  @MaxLength(100)
  event_type!: string;

  @IsOptional()
  @IsString()
  question_id?: string;

  @IsOptional()
  @IsString()
  attempt_items_id?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
