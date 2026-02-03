import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO for a single preview row from CSV
export class PreviewRowDto {
  @IsString()
  @IsNotEmpty()
  student_code: string;

  @IsEmail()
  email: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;
}

// DTO for creating a preview session
export class CreatePreviewSessionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviewRowDto)
  rows: PreviewRowDto[];
}

// DTO for editing a preview row
export class EditPreviewRowDto {
  @IsString()
  @IsOptional()
  student_code?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;
}

// Response types
export type PreviewRowStatus =
  | 'NEW'
  | 'EXISTS_NOT_ENROLLED'
  | 'ALREADY_ENROLLED'
  | 'DUPLICATE_IDENTITY'
  | 'MISSING';

export interface PreviewRowResponse {
  id: string;
  row_index: number;
  student_code: string;
  email: string;
  first_name: string;
  last_name: string;
  status: PreviewRowStatus;
  note?: string;
  is_deleted: boolean;
}

export interface PreviewSessionResponse {
  sessionId: string;
  expiresAt: Date;
  rows: PreviewRowResponse[];
  summary: {
    total: number;
    new: number;
    existsNotEnrolled: number;
    alreadyEnrolled: number;
    duplicateIdentity: number;
    missing: number;
  };
}

export interface ConfirmResult {
  student_code: string;
  email: string;
  status: 'enrolled' | 'already_enrolled' | 'failed' | 'skipped';
  note?: string;
}

export interface ConfirmResponse {
  results: ConfirmResult[];
  summary: {
    total: number;
    enrolled: number;
    alreadyEnrolled: number;
    failed: number;
    skipped: number;
  };
}
