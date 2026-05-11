import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

export class UpdateKnowledgeCategoriesDto {
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
  names!: string[];
}
