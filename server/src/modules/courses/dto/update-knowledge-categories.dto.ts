import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

export class KnowledgeCategoryInputDto {
  @IsString()
  @MaxLength(FIELD_LENGTHS.knowledgeCategoryCode, {
    message: maxLengthMessage(
      'รหัสหมวดหมู่ความรู้',
      FIELD_LENGTHS.knowledgeCategoryCode,
    ),
  })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'รหัสหมวดหมู่ความรู้ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข _ และ -',
  })
  code!: string;

  @IsString()
  @MaxLength(FIELD_LENGTHS.knowledgeCategoryName, {
    message: maxLengthMessage(
      'ชื่อหมวดหมู่ความรู้',
      FIELD_LENGTHS.knowledgeCategoryName,
    ),
  })
  name!: string;
}

export class UpdateKnowledgeCategoriesDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100, { message: 'หมวดหมู่ความรู้ต้องไม่เกิน 100 รายการ' })
  @ValidateNested({ each: true })
  @Type(() => KnowledgeCategoryInputDto)
  categories?: KnowledgeCategoryInputDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100, { message: 'หมวดหมู่ความรู้ต้องไม่เกิน 100 รายการ' })
  @IsString({ each: true })
  @MaxLength(FIELD_LENGTHS.knowledgeCategoryName, {
    each: true,
    message: maxLengthMessage(
      'ชื่อหมวดหมู่ความรู้',
      FIELD_LENGTHS.knowledgeCategoryName,
    ),
  })
  names?: string[];
}
