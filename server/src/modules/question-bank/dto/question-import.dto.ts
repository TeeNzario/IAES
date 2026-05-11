import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const DIFFICULTY_LABELS = ['ง่าย', 'กลาง', 'ยาก'] as const;
const DIFFICULTY_VALUES: Record<string, number> = { 'ง่าย': -1, 'กลาง': 0, 'ยาก': 1 };

export function mapDifficultyLabel(label: string): number | null {
  return DIFFICULTY_VALUES[label] ?? null;
}

export function validDifficultyLabels(): readonly string[] {
  return DIFFICULTY_LABELS;
}

// DTO for a single preview row from CSV
// All fields are optional at the class-validator level —
// validation happens in service-level row validation so invalid rows
// are flagged as ERROR instead of rejecting the entire request.
export class QuestionImportRowDto {
  @IsOptional()
  @IsString()
  question_text?: string;

  @IsOptional()
  @IsString()
  choice_1?: string;

  @IsOptional()
  @IsString()
  choice_2?: string;

  @IsOptional()
  @IsString()
  choice_3?: string;

  @IsOptional()
  @IsString()
  choice_4?: string;

  @IsOptional()
  correct?: number | string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  knowledge_categories?: string;
}

// DTO for creating a preview session
export class CreateQuestionImportSessionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionImportRowDto)
  rows: QuestionImportRowDto[];
}

// DTO for editing a preview row
export class EditQuestionImportRowDto {
  @IsOptional()
  @IsString()
  question_text?: string;

  @IsOptional()
  @IsString()
  choice_1?: string;

  @IsOptional()
  @IsString()
  choice_2?: string;

  @IsOptional()
  @IsString()
  choice_3?: string;

  @IsOptional()
  @IsString()
  choice_4?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  correct?: number;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  knowledge_categories?: string;
}

// Response types
export type QuestionImportRowStatus = 'NEW' | 'ERROR';

export interface QuestionImportRowResponse {
  id: string;
  row_index: number;
  question_text: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_choice: number;
  difficulty: string;
  knowledge_categories: string;
  status: QuestionImportRowStatus;
  note?: string;
  is_deleted: boolean;
}

export interface QuestionImportSessionResponse {
  sessionId: string;
  expiresAt: Date;
  rows: QuestionImportRowResponse[];
  summary: {
    total: number;
    ready: number;
    errors: number;
  };
}

export interface QuestionImportResult {
  row_index: number;
  question_text: string;
  status: 'imported' | 'failed' | 'skipped';
  note?: string;
}

export interface QuestionImportConfirmResponse {
  results: QuestionImportResult[];
  summary: {
    total: number;
    imported: number;
    failed: number;
    skipped: number;
  };
}
