// ...existing code...
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import {
  DEFAULT_CURRICULUM_ID,
  DEFAULT_TITLE,
} from 'src/lib/academic-defaults';
import { hashPassword } from '../../lib/password';
import { AuditActor, AuditService } from '../audit/audit.service';

const studentPublicSelect = {
  student_code: true,
  email: true,
  facultyCode: true,
  title: true,
  curriculumId: true,
  first_name: true,
  last_name: true,
  is_active: true,
};

const studentPublicTimestampSelect = {
  ...studentPublicSelect,
  created_at: true,
  updated_at: true,
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(createStudentDto: CreateStudentDto) {
    // Check for duplicate student_code
    const existing = await this.prisma.students.findUnique({
      where: { student_code: createStudentDto.student_code },
    });

    if (existing) {
      throw new Error('Student code already exists');
    }

    const student = await this.prisma.students.create({
      data: {
        student_code: createStudentDto.student_code,
        email: createStudentDto.email,
        password_hash: await hashPassword(
          createStudentDto.password ?? createStudentDto.student_code,
        ),
        facultyCode: createStudentDto.facultyCode,
        title: createStudentDto.title ?? DEFAULT_TITLE,
        curriculumId: createStudentDto.curriculumId ?? DEFAULT_CURRICULUM_ID,
        first_name: createStudentDto.first_name,
        last_name: createStudentDto.last_name,
        is_active: true,
      },
      select: studentPublicSelect,
    });

    return student;
  }

  findAll() {
    return this.prisma.students.findMany({
      select: studentPublicTimestampSelect,
      orderBy: { student_code: 'asc' },
    });
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
        facultyCode: true,
        title: true,
        curriculumId: true,
        first_name: true,
        last_name: true,
      },
    });
  }

  private async recordStudentUpdateAudit(
    tx: any,
    actor: AuditActor | undefined,
    studentCode: string,
    passwordChanged: boolean,
    previousActive: boolean | undefined,
    nextActive: boolean | undefined,
  ) {
    if (passwordChanged) {
      await this.audit.record(
        {
          actor,
          action: 'student.password_changed',
          entityType: 'student',
          entityId: studentCode,
        },
        tx,
      );
    }

    if (
      nextActive !== undefined &&
      previousActive !== undefined &&
      previousActive !== nextActive
    ) {
      await this.audit.record(
        {
          actor,
          action: nextActive ? 'student.activated' : 'student.deactivated',
          entityType: 'student',
          entityId: studentCode,
          metadata: {
            previousActive,
            nextActive,
          },
        },
        tx,
      );
    }
  }

  async updateByStudentCode(
    student_code: string,
    dto: UpdateStudentDto,
    actor?: AuditActor,
  ) {
    const { password, ...rest } = dto;
    let previousActive: boolean | undefined;

    if (rest.is_active !== undefined) {
      const existing = await this.prisma.students.findUnique({
        where: { student_code },
        select: { is_active: true },
      });
      previousActive = existing?.is_active;
    }

    const data = password
      ? { ...rest, password_hash: await hashPassword(password) }
      : rest;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.students.update({
        where: { student_code },
        data,
        select: studentPublicTimestampSelect,
      });

      if (password) {
        await tx.$executeRaw`
          UPDATE "students"
          SET "password_changed_at" = CURRENT_TIMESTAMP
          WHERE "student_code" = ${student_code}
        `;
      }

      await this.recordStudentUpdateAudit(
        tx,
        actor,
        student_code,
        Boolean(password),
        previousActive,
        rest.is_active,
      );

      return updated;
    });
  }

  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
    actor?: AuditActor,
  ) {
    const { password, ...rest } = updateStudentDto;
    let previousActive: boolean | undefined;

    if (rest.is_active !== undefined) {
      const existing = await this.prisma.students.findUnique({
        where: { student_code: id },
        select: { is_active: true },
      });
      previousActive = existing?.is_active;
    }

    const data = password
      ? { ...rest, password_hash: await hashPassword(password) }
      : rest;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.students.update({
        where: { student_code: id },
        data: {
          ...data,
          updated_at: new Date(),
        },
        select: studentPublicTimestampSelect,
      });

      if (password) {
        await tx.$executeRaw`
          UPDATE "students"
          SET "password_changed_at" = CURRENT_TIMESTAMP
          WHERE "student_code" = ${id}
        `;
      }

      await this.recordStudentUpdateAudit(
        tx,
        actor,
        id,
        Boolean(password),
        previousActive,
        rest.is_active,
      );

      return updated;
    });
  }

  remove(id: string, actor?: AuditActor) {
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.students.delete({
        where: { student_code: id },
        select: studentPublicSelect,
      });

      await this.audit.record(
        {
          actor,
          action: 'student.deleted',
          entityType: 'student',
          entityId: id,
          metadata: {
            email: deleted.email,
            is_active: deleted.is_active,
          },
        },
        tx,
      );

      return deleted;
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
