import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkEnrollStudentRowDto {
  @IsString()
  @IsNotEmpty()
  student_code: string;

  @IsEmail()
  email: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsBoolean()
  @IsOptional()
  allowOverwrite?: boolean;
}

export class BulkEnrollStudentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEnrollStudentRowDto)
  students: BulkEnrollStudentRowDto[];
}

// Result types for response
export interface BulkEnrollRowResult {
  student_code: string;
  email: string;
  enrollmentStatus: 'enrolled' | 'already_enrolled' | 'failed';
  directoryAction: 'created' | 'updated' | 'unchanged';
  note?: string;
}

export interface BulkEnrollResponse {
  results: BulkEnrollRowResult[];
  summary: {
    total: number;
    enrolled: number;
    alreadyEnrolled: number;
    failed: number;
  };
}
