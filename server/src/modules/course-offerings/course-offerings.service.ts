import {
  BadRequestException,
  Injectable,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DEFAULT_CURRICULUM_ID,
  DEFAULT_TITLE,
  INVITE_PLACEHOLDER_PASSWORD,
} from 'src/lib/academic-defaults';
import { FACULTY_MAP } from 'src/lib/faculty-map';
import { CreateCourseOfferingDto } from './dto/create-course-offerings.dto';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto';
import { AddStudentDto } from './dto/add-student.dto';
import {
  BulkEnrollStudentDto,
  BulkEnrollStudentRowDto,
  BulkEnrollRowResult,
  BulkEnrollResponse,
} from './dto/bulk-enroll-student.dto';
import { Prisma } from 'src/generated/prisma/client';
import { hashPassword } from '../../lib/password';
import type { RequestUser } from 'src/auth/types/jwt-payload.type';
import { AuditActor, AuditService } from '../audit/audit.service';
import { AcademicSettingsService } from '../academic-settings/academic-settings.service';

const STUDENT_CODE_REGEX = /^\d{8}$/;
const EMAIL_DOMAIN = '@mail.wu.ac.th';
const CANONICAL_CURRICULUM_ID_REGEX = /^CUR(00[1-9]|0[1-6][0-9])$/;
const VALID_FACULTY_CODES = new Set(Object.keys(FACULTY_MAP).map(Number));

const courseOfferingSelect = {
  course_offerings_id: true,
  academic_year: true,
  semester: true,
  is_active: true,

  courses: {
    select: {
      course_code: true,
      course_name: true,
      course_name_th: true,
      course_name_en: true,
    },
  },

  course_instructors: {
    orderBy: {
      staff_users_id: 'asc' as const,
    },
    select: {
      staff_users_id: true,
      staff_users: {
        select: {
          first_name: true,
          last_name: true,
          facultyCode: true,
          title: true,
          curriculumId: true,
        },
      },
    },
  },

  _count: {
    select: {
      course_exams: true,
    },
  },
};

function serializeBigInt(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
}

@Injectable()
export class CourseOfferingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly academicSettings: AcademicSettingsService,
  ) {}

  private async assertInstructorForOffering(
    offeringId: bigint,
    staffUserId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const instructorId = BigInt(staffUserId);
    const link = await client.course_instructors.findFirst({
      where: {
        course_offerings_id: offeringId,
        staff_users_id: instructorId,
      },
      select: { staff_users_id: true },
    });

    if (!link) {
      throw new ForbiddenException('You are not assigned to this offering.');
    }
  }

  private async assertCanViewOffering(
    offeringId: bigint,
    user: RequestUser,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    if (user.type === 'staff') {
      await this.assertInstructorForOffering(offeringId, user.sub, client);
      return;
    }

    const enrollment = await client.course_enrollments.findUnique({
      where: {
        course_offerings_id_student_code: {
          course_offerings_id: offeringId,
          student_code: user.sub,
        },
      },
      select: { student_code: true },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this offering.');
    }
  }

  private async assertNoExamsForDelete(
    offeringId: bigint,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const examsCount = await client.course_exams.count({
      where: { course_offerings_id: offeringId },
    });

    if (examsCount > 0) {
      throw new ConflictException(
        'ไม่สามารถลบได้ เนื่องจากรายวิชานี้มีการสร้างชุดสอบหรือการสอบแล้ว',
      );
    }
  }

  async create(dto: CreateCourseOfferingDto, creatorId: string) {
    const currentTerm =
      dto.academic_year == null || dto.semester == null
        ? await this.academicSettings.getCurrentTerm()
        : null;
    const academicYear = dto.academic_year ?? currentTerm!.academic_year;
    const semester = dto.semester ?? currentTerm!.semester;

    // Prepend creator ID to instructor list (creator is always first)
    const allInstructorIds = [
      BigInt(creatorId),
      ...(dto.instructor_ids ?? []).map((instructorId) => BigInt(instructorId)),
    ];

    if (!dto.courses_id || dto.courses_id === 'undefined') {
      throw new BadRequestException('Invalid courses_id');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const courseId = BigInt(dto.courses_id);

        const courseOffering = await tx.course_offerings.create({
          data: {
            courses: {
              connect: {
                courses_id: courseId,
              },
            },
            academic_year: academicYear,
            semester,
            ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
          },
        });

        await tx.course_instructors.createMany({
          data: allInstructorIds.map((instructorId) => ({
            staff_users_id: instructorId,
            course_offerings_id: courseOffering.course_offerings_id,
          })),
        });

        return serializeBigInt(courseOffering);
      });
    } catch (error: unknown) {
      const err = error as any;

      console.log('FULL ERROR:', err);
      console.log('Prisma code:', err?.code);
      console.log('PG originalCode:', err?.cause?.originalCode);

      //handle a course offering in semester and academic year already exists
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'Course offering already exists for this course, academic year, and semester',
        );
      }

      if (err?.cause?.originalCode === '23505') {
        throw new ConflictException(
          'This course is already opened for this academic year and semester',
        );
      }

      throw new InternalServerErrorException(
        'Failed to create course offering',
      );
    }
  }

  /**
   * Find course offerings for a specific user.
   * CRITICAL: This method MUST validate identifiers to prevent data leakage.
   *
   * Why the previous OR-based logic was unsafe:
   * If staffUserId or studentCode is undefined/null, Prisma's `some` filter
   * with an undefined value matches ALL records, leaking the entire table.
   */
  async findByUser(user: {
    type: 'student' | 'staff';
    staffUserId?: string;
    studentCode?: string;
  }) {
    // CRITICAL: Validate required identifiers to prevent data leakage
    if (user.type === 'staff') {
      if (!user.staffUserId) {
        throw new BadRequestException(
          'staffUserId is required for staff users',
        );
      }

      const offerings = await this.prisma.course_offerings.findMany({
        where: {
          courses: {
            is_active: true,
          },
          course_instructors: {
            some: {
              staff_users_id: BigInt(user.staffUserId),
            },
          },
        },
        select: courseOfferingSelect,
        orderBy: [{ academic_year: 'desc' }, { semester: 'desc' }],
      });

      return serializeBigInt(offerings);
    }

    if (user.type === 'student') {
      if (!user.studentCode) {
        throw new BadRequestException(
          'studentCode is required for student users',
        );
      }

      const offerings = await this.prisma.course_offerings.findMany({
        where: {
          is_active: true,
          courses: {
            is_active: true,
          },
          course_enrollments: {
            some: {
              student_code: user.studentCode,
            },
          },
        },
        select: courseOfferingSelect,
        orderBy: [{ academic_year: 'desc' }, { semester: 'desc' }],
      });

      return serializeBigInt(offerings);
    }

    // Unknown user type - should never reach here
    throw new BadRequestException('Invalid user type');
  }

  //   async findByStudentCode(studentCode: string) {
  //   const offerings = await this.prisma.course_offerings.findMany({
  //     where: {
  //       course_enrollments: {
  //         some: {
  //           student_code: studentCode,
  //         },
  //       },
  //     },
  //     select: courseOfferingSelect,
  //     orderBy: [{ academic_year: 'desc' }, { semester: 'desc' }],
  //   });

  //   return serializeBigInt(offerings);
  // }

  async findOneById(offeringId: string, user: RequestUser) {
    if (!offeringId || offeringId === 'undefined') {
      throw new BadRequestException('Invalid course_offerings_id');
    }

    const id = BigInt(offeringId);

    await this.assertCanViewOffering(id, user);

    const offering = await this.prisma.course_offerings.findUnique({
      where: {
        course_offerings_id: id,
      },
      select: courseOfferingSelect,
    });

    if (!offering) {
      throw new BadRequestException('Course offering not found');
    }

    return serializeBigInt(offering);
  }

  async addStudentToOffering(
    offeringId: string,
    dto: AddStudentDto,
    staffUserId: string,
  ) {
    const offeringBigInt = BigInt(offeringId);

    // Validate student_code: exactly 8 digits
    if (!STUDENT_CODE_REGEX.test(dto.student_code)) {
      throw new BadRequestException(
        'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลักเท่านั้น',
      );
    }

    // Validate email domain: @mail.wu.ac.th only
    if (
      !dto.email.endsWith(EMAIL_DOMAIN) ||
      dto.email.split('@').length !== 2 ||
      !dto.email.split('@')[0]
    ) {
      throw new BadRequestException('อีเมลต้องเป็น @mail.wu.ac.th เท่านั้น');
    }

    if (!VALID_FACULTY_CODES.has(dto.facultyCode)) {
      throw new BadRequestException(
        'รหัสสำนักวิชาไม่ถูกต้อง กรุณาใช้รหัส 1-18',
      );
    }

    const curriculumId = dto.curriculumId ?? DEFAULT_CURRICULUM_ID;
    if (!CANONICAL_CURRICULUM_ID_REGEX.test(curriculumId)) {
      throw new BadRequestException(
        'รหัสหลักสูตรไม่ถูกต้อง กรุณาใช้รหัส CUR001-CUR069',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.assertInstructorForOffering(offeringBigInt, staffUserId, tx);

      // 0. Look up existing student to detect email change (for directory cleanup)
      const existingStudent = await tx.students.findUnique({
        where: { student_code: dto.student_code },
        select: { email: true },
      });
      const oldEmail = existingStudent?.email;

      // 1. Check for email conflict: different student_code already uses this email
      if (!oldEmail || oldEmail !== dto.email) {
        const emailOwner = await tx.students.findUnique({
          where: { email: dto.email },
          select: { student_code: true },
        });
        if (emailOwner && emailOwner.student_code !== dto.student_code) {
          throw new ConflictException(
            `อีเมลนี้ถูกใช้โดยนักศึกษารหัส ${emailOwner.student_code} แล้ว`,
          );
        }
      }

      // 2. Upsert student_directory for the new email
      await tx.student_directory.upsert({
        where: { email: dto.email },
        update: {
          student_code: dto.student_code,
          first_name: dto.first_name,
          last_name: dto.last_name,
        },
        create: {
          student_code: dto.student_code,
          email: dto.email,
          first_name: dto.first_name,
          last_name: dto.last_name,
        },
      });

      // 2b. Clean up old student_directory entry when email changed
      if (oldEmail && oldEmail !== dto.email) {
        await tx.student_directory.deleteMany({
          where: { email: oldEmail },
        });
      }

      // 3. Ensure student auth record exists (or update)
      await tx.students.upsert({
        where: { student_code: dto.student_code },
        update: {
          email: dto.email,
          title: dto.title ?? DEFAULT_TITLE,
          facultyCode: dto.facultyCode,
          curriculumId,
          first_name: dto.first_name,
          last_name: dto.last_name,
        },
        create: {
          student_code: dto.student_code,
          email: dto.email,
          password_hash: await hashPassword(INVITE_PLACEHOLDER_PASSWORD),
          facultyCode: dto.facultyCode,
          title: dto.title ?? DEFAULT_TITLE,
          curriculumId,
          first_name: dto.first_name,
          last_name: dto.last_name,
        },
      });

      // 4. Check if already enrolled (idempotent)
      const existingEnrollment = await tx.course_enrollments.findUnique({
        where: {
          course_offerings_id_student_code: {
            course_offerings_id: offeringBigInt,
            student_code: dto.student_code,
          },
        },
      });

      if (existingEnrollment) {
        throw new ConflictException('นักศึกษานี้ลงทะเบียนในรายวิชานี้แล้ว');
      }

      // 5. Enroll student
      await tx.course_enrollments.create({
        data: {
          course_offerings_id: offeringBigInt,
          student_code: dto.student_code,
        },
      });

      return { success: true };
    });
  }

  async getStudentsByOffering(offeringId: string, user: RequestUser) {
    const id = BigInt(offeringId);

    await this.assertCanViewOffering(id, user);

    const enrollments = await this.prisma.course_enrollments.findMany({
      where: {
        course_offerings_id: id,
      },
      select: {
        student_code: true,
        students: {
          select: {
            student_code: true,
            first_name: true,
            last_name: true,
            email: true,
            facultyCode: true,
            title: true,
            curriculumId: true,
          },
        },
      },
      orderBy: {
        enrolled_at: 'asc',
      },
    });

    return enrollments.map((e) => ({
      student_code: e.student_code,
      first_name: e.students.first_name,
      last_name: e.students.last_name,
      email: e.students.email,
      facultyCode: e.students.facultyCode,
      title: e.students.title,
      curriculumId: e.students.curriculumId,
    }));
  }

  /**
   * Bulk enroll students into a course offering
   * Each row is processed in its own transaction for fault isolation
   */
  async bulkEnrollStudents(
    offeringId: string,
    dto: BulkEnrollStudentDto,
    staffUserId: string,
    actor?: AuditActor,
  ): Promise<BulkEnrollResponse> {
    const offeringBigInt = BigInt(offeringId);
    const results: BulkEnrollRowResult[] = [];
    const placeholderHash = await hashPassword(INVITE_PLACEHOLDER_PASSWORD);

    await this.assertInstructorForOffering(offeringBigInt, staffUserId);

    for (const row of dto.students) {
      try {
        const result = await this.processStudentRow(
          offeringBigInt,
          row,
          placeholderHash,
        );
        results.push(result);
      } catch (error) {
        results.push({
          student_code: row.student_code,
          email: row.email,
          enrollmentStatus: 'failed',
          directoryAction: 'unchanged',
          note: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const response = {
      results,
      summary: {
        total: results.length,
        enrolled: results.filter((r) => r.enrollmentStatus === 'enrolled')
          .length,
        alreadyEnrolled: results.filter(
          (r) => r.enrollmentStatus === 'already_enrolled',
        ).length,
        failed: results.filter((r) => r.enrollmentStatus === 'failed').length,
      },
    };

    await this.audit.record({
      actor,
      action: 'course_offering.bulk_enroll',
      entityType: 'course_offering',
      entityId: offeringId,
      metadata: response.summary,
    });

    return response;
  }

  /**
   * Process a single student row in a transaction
   */
  private async processStudentRow(
    offeringBigInt: bigint,
    row: BulkEnrollStudentRowDto,
    placeholderHash: string,
  ): Promise<BulkEnrollRowResult> {
    return this.prisma.$transaction(async (tx) => {
      let directoryAction: 'created' | 'updated' | 'unchanged' = 'unchanged';
      const curriculumId = row.curriculumId ?? DEFAULT_CURRICULUM_ID;

      if (!VALID_FACULTY_CODES.has(row.facultyCode)) {
        throw new Error('รหัสสำนักวิชาไม่ถูกต้อง กรุณาใช้รหัส 1-18');
      }

      if (!CANONICAL_CURRICULUM_ID_REGEX.test(curriculumId)) {
        throw new Error('รหัสหลักสูตรไม่ถูกต้อง กรุณาใช้รหัส CUR001-CUR069');
      }

      // Step A: Upsert student_directory (global identity truth)
      const existingDirectory = await tx.student_directory.findFirst({
        where: {
          OR: [{ email: row.email }, { student_code: row.student_code }],
        },
      });

      if (existingDirectory) {
        if (row.allowOverwrite) {
          await tx.student_directory.update({
            where: {
              student_directory_id: existingDirectory.student_directory_id,
            },
            data: {
              first_name: row.first_name,
              last_name: row.last_name,
              email: row.email,
              student_code: row.student_code,
            },
          });
          directoryAction = 'updated';
        }
        // else: keep existing, directoryAction stays 'unchanged'
      } else {
        await tx.student_directory.create({
          data: {
            student_code: row.student_code,
            email: row.email,
            first_name: row.first_name,
            last_name: row.last_name,
          },
        });
        directoryAction = 'created';
      }

      // Step B: Upsert students table (auth entity)
      await tx.students.upsert({
        where: { student_code: row.student_code },
        update: {
          email: row.email,
          title: row.title ?? DEFAULT_TITLE,
          facultyCode: row.facultyCode,
          curriculumId,
          first_name: row.first_name,
          last_name: row.last_name,
        },
        create: {
          student_code: row.student_code,
          email: row.email,
          password_hash: placeholderHash,
          facultyCode: row.facultyCode,
          title: row.title ?? DEFAULT_TITLE,
          curriculumId,
          first_name: row.first_name,
          last_name: row.last_name,
        },
      });

      // Step C: Enroll (idempotent - skip if already enrolled)
      const existingEnrollment = await tx.course_enrollments.findUnique({
        where: {
          course_offerings_id_student_code: {
            course_offerings_id: offeringBigInt,
            student_code: row.student_code,
          },
        },
      });

      if (existingEnrollment) {
        return {
          student_code: row.student_code,
          email: row.email,
          enrollmentStatus: 'already_enrolled' as const,
          directoryAction,
        };
      }

      await tx.course_enrollments.create({
        data: {
          course_offerings_id: offeringBigInt,
          student_code: row.student_code,
        },
      });

      return {
        student_code: row.student_code,
        email: row.email,
        enrollmentStatus: 'enrolled' as const,
        directoryAction,
      };
    });
  }

  /**
   * Update a course offering
   * Handles academic_year, semester, is_active, and instructors
   */
  async update(
    offeringId: string,
    dto: UpdateCourseOfferingDto,
    userId: string,
  ) {
    if (!offeringId || offeringId === 'undefined') {
      throw new BadRequestException('Invalid course_offerings_id');
    }

    const id = BigInt(offeringId);

    return this.prisma.$transaction(async (tx) => {
      await this.assertInstructorForOffering(id, userId, tx);

      // Build update data object
      const updateData: any = {};
      if (dto.academic_year !== undefined)
        updateData.academic_year = dto.academic_year;
      if (dto.semester !== undefined) updateData.semester = dto.semester;
      if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

      // Update offering basic fields
      if (Object.keys(updateData).length > 0) {
        await tx.course_offerings.update({
          where: { course_offerings_id: id },
          data: updateData,
        });
      }

      // Update instructors if provided
      if (dto.instructor_ids !== undefined) {
        // Prepend the current user (owner) to instructor list
        const allInstructorIds = [
          BigInt(userId),
          ...(dto.instructor_ids ?? []).map((instructorId) =>
            BigInt(instructorId),
          ),
        ];

        const currentInstructors = await tx.course_instructors.findMany({
          where: { course_offerings_id: id },
          select: { staff_users_id: true },
        });
        const nextInstructorIds = new Set(
          allInstructorIds.map((instructorId) => instructorId.toString()),
        );
        const removesInstructor = currentInstructors.some(
          (instructor) =>
            !nextInstructorIds.has(instructor.staff_users_id.toString()),
        );

        if (removesInstructor) {
          await this.assertNoExamsForDelete(id, tx);
        }

        // Delete existing instructors
        await tx.course_instructors.deleteMany({
          where: { course_offerings_id: id },
        });

        // Create new instructor associations
        await tx.course_instructors.createMany({
          data: allInstructorIds.map((instructorId) => ({
            staff_users_id: instructorId,
            course_offerings_id: id,
          })),
        });
      }

      // Fetch and return the updated offering
      const updated = await tx.course_offerings.findUnique({
        where: { course_offerings_id: id },
        select: courseOfferingSelect,
      });

      return serializeBigInt(updated);
    });
  }

  /**
   * Check if a student code already exists in a specific course offering
   * @param offeringId - The course offering ID to check within
   * @param studentCode - The student code to check
   * @returns true if exists, false otherwise
   */
  async checkStudentCodeExists(
    offeringId: string,
    studentCode: string,
    staffUserId: string,
  ): Promise<boolean> {
    if (!studentCode?.trim() || !offeringId) return false;

    const id = BigInt(offeringId);

    await this.assertInstructorForOffering(id, staffUserId);

    const existing = await this.prisma.course_enrollments.findUnique({
      where: {
        course_offerings_id_student_code: {
          course_offerings_id: id,
          student_code: studentCode.trim(),
        },
      },
      select: { student_code: true },
    });

    return existing !== null;
  }

  /**
   * Check if an email already exists in a specific course offering OR is used
   * by a different student_code globally (email is unique across all students).
   */
  async checkStudentEmailExists(
    offeringId: string,
    email: string,
    staffUserId: string,
    excludeStudentCode?: string,
  ): Promise<boolean> {
    if (!email?.trim() || !offeringId) return false;

    const id = BigInt(offeringId);

    await this.assertInstructorForOffering(id, staffUserId);

    // Check enrollment in this offering (skip if same student_code is being re-added)
    const enrollment = await this.prisma.course_enrollments.findFirst({
      where: {
        course_offerings_id: id,
        students: {
          email: email.trim(),
        },
      },
      select: { student_code: true },
    });

    if (enrollment && enrollment.student_code !== excludeStudentCode) {
      return true;
    }

    // Also check global students table: email is @unique across all students
    const globalStudent = await this.prisma.students.findUnique({
      where: { email: email.trim() },
      select: { student_code: true },
    });

    if (!globalStudent) return false;

    // If the email belongs to the same student_code being checked, it's not a duplicate
    if (
      excludeStudentCode &&
      globalStudent.student_code === excludeStudentCode
    ) {
      return false;
    }

    return true;
  }

  /**
   * Un-enroll a student from a specific course offering
   * This removes the enrollment record, NOT the student record
   * @param offeringId - The course offering ID
   * @param studentCode - The student code to un-enroll
   */
  async unenrollStudent(
    offeringId: string,
    studentCode: string,
    staffUserId: string,
  ): Promise<{ success: boolean }> {
    const id = BigInt(offeringId);

    await this.assertInstructorForOffering(id, staffUserId);
    await this.assertNoExamsForDelete(id);

    await this.prisma.course_enrollments.delete({
      where: {
        course_offerings_id_student_code: {
          course_offerings_id: id,
          student_code: studentCode,
        },
      },
    });

    return { success: true };
  }

  async removeInstructorFromOffering(
    offeringId: string,
    targetStaffUserId: string,
    actorStaffUserId: string,
  ): Promise<{ success: boolean }> {
    if (!offeringId || offeringId === 'undefined') {
      throw new BadRequestException('Invalid course_offerings_id');
    }
    if (!targetStaffUserId || targetStaffUserId === 'undefined') {
      throw new BadRequestException('Invalid staff_users_id');
    }

    const id = BigInt(offeringId);
    const targetId = BigInt(targetStaffUserId);

    return this.prisma.$transaction(async (tx) => {
      await this.assertInstructorForOffering(id, actorStaffUserId, tx);
      await this.assertNoExamsForDelete(id, tx);

      const instructors = await tx.course_instructors.findMany({
        where: { course_offerings_id: id },
        select: { staff_users_id: true },
        orderBy: { staff_users_id: 'asc' },
      });

      if (
        !instructors.some(
          (instructor) => instructor.staff_users_id === targetId,
        )
      ) {
        throw new BadRequestException(
          'Instructor is not assigned to this offering.',
        );
      }

      if (instructors[0]?.staff_users_id === targetId) {
        throw new BadRequestException('Primary instructor cannot be removed.');
      }

      await tx.course_instructors.delete({
        where: {
          course_offerings_id_staff_users_id: {
            course_offerings_id: id,
            staff_users_id: targetId,
          },
        },
      });

      return { success: true };
    });
  }

  /**
   * Delete a course offering
   * Business rule: Can only delete if no students are enrolled
   * @param offeringId - The course offering ID to delete
   */
  async remove(
    offeringId: string,
    staffUserId: string,
  ): Promise<{ success: boolean }> {
    if (!offeringId || offeringId === 'undefined') {
      throw new BadRequestException('Invalid course_offerings_id');
    }

    const id = BigInt(offeringId);

    await this.assertInstructorForOffering(id, staffUserId);
    await this.assertNoExamsForDelete(id);

    // Check if any students are enrolled
    const enrollmentsCount = await this.prisma.course_enrollments.count({
      where: { course_offerings_id: id },
    });

    if (enrollmentsCount > 0) {
      throw new ConflictException(
        'Cannot delete this course offering because students are already enrolled.',
      );
    }

    await this.prisma.course_offerings.delete({
      where: { course_offerings_id: id },
    });

    return { success: true };
  }
}
