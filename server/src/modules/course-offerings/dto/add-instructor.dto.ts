import { IsNotEmpty, Matches } from 'class-validator';

export class AddInstructorDto {
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'รหัสอาจารย์ไม่ถูกต้อง' })
  staff_users_id: string;
}
