// ...existing code...
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createStudentDto: CreateStudentDto) {
    return 'This action adds a new student';
  }

  findAll() {
    return this.prisma.students.findMany();
  }

  // findOne(id: string) {
  //   return `This action returns a #${id} student`;
  // }

    // users/users.service.ts
  async findById(student_code: string) {
    return this.prisma.students.findUnique({
      where: { student_code },
      select: {
        student_code: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });
  }

  async updateByStudentCode(
  student_code: string,
  dto: UpdateStudentDto,
) {
  return this.prisma.students.update({
    where: { student_code },
    data: dto,
  });
}



  update(id: string, updateStudentDto: UpdateStudentDto) {
    return this.prisma.students.update({
      where: { student_code: id },
      data: {
        ...updateStudentDto,
        updated_at: new Date(),
      },
      select: {
        student_code: true,
        email: true,
        first_name: true,
        last_name: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  remove(id: string) {
  return this.prisma.students.delete({
    where: { student_code: id },
  });
}
}
