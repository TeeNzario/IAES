import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

export class CreateQuestionCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(FIELD_LENGTHS.collectionTitle, {
    message: maxLengthMessage('ชื่อชุดคำถาม', FIELD_LENGTHS.collectionTitle),
  })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LENGTHS.collectionDescription, {
    message: maxLengthMessage(
      'คำอธิบายชุดคำถาม',
      FIELD_LENGTHS.collectionDescription,
    ),
  })
  description?: string;
}
