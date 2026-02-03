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

  async updateByStudentCode(student_code: string, dto: UpdateStudentDto) {
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

  /**
   * Get course offerings that a student is enrolled in
   */
  async findEnrollments(studentCode: string) {
    const enrollments = await this.prisma.course_enrollments.findMany({
      where: { student_code: studentCode },
      include: {
        course_offerings: {
          include: {
            courses: {
              select: {
                course_code: true,
                course_name: true,
              },
            },
          },
        },
      },
    });

    // Serialize BigInt and return course offerings
    return enrollments.map((e) => ({
      course_offerings_id: e.course_offerings.course_offerings_id.toString(),
      academic_year: e.course_offerings.academic_year,
      semester: e.course_offerings.semester,
      courses: e.course_offerings.courses,
    }));
  }

  /**
   * Check if a student code already exists
   * @param studentCode - The student code to check
   * @param excludeCode - Optional code to exclude (for edit mode)
   */
  async checkStudentCodeExists(
    studentCode: string,
    excludeCode?: string,
  ): Promise<boolean> {
    if (!studentCode?.trim()) return false;

    const where: any = { student_code: studentCode.trim() };

    if (excludeCode) {
      where.NOT = { student_code: excludeCode };
    }

    const existing = await this.prisma.students.findFirst({
      where,
      select: { student_code: true },
    });

    return existing !== null;
  }
}
