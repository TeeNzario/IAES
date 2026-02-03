import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCourseOfferingDto } from './dto/create-course-offerings.dto';
import { AddStudentDto } from './dto/add-student.dto';
import {
  BulkEnrollStudentDto,
  BulkEnrollStudentRowDto,
  BulkEnrollRowResult,
  BulkEnrollResponse,
} from './dto/bulk-enroll-student.dto';

const courseOfferingSelect = {
  course_offerings_id: true,
  academic_year: true,
  semester: true,

  courses: {
    select: {
      course_code: true,
      course_name: true,
    },
  },

  course_instructors: {
    select: {
      staff_users_id: true,
      staff_users: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseOfferingDto, creatorId: number) {
    // Prepend creator ID to instructor list (creator is always first)
    const allInstructorIds = [creatorId, ...dto.instructor_ids];

    if (!dto.courses_id || dto.courses_id === 'undefined') {
      throw new BadRequestException('Invalid courses_id');
    }

    return this.prisma.$transaction(async (tx) => {
      const courseId = BigInt(dto.courses_id);

      const courseOffering = await tx.course_offerings.create({
        data: {
          courses: {
            connect: {
              courses_id: courseId,
            },
          },
          academic_year: dto.academic_year,
          semester: dto.semester,
        },
      });

      await tx.course_instructors.createMany({
        data: allInstructorIds.map((instructorId) => ({
          staff_users_id: instructorId,
          course_offerings_id: courseOffering.course_offerings_id,
        })),
      });

      console.log(courseOffering);

      return serializeBigInt(courseOffering);
    });
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
    type: 'STUDENT' | 'STAFF';
    staffUserId?: number;
    studentCode?: string;
  }) {
    // CRITICAL: Validate required identifiers to prevent data leakage
    if (user.type === 'STAFF') {
      if (!user.staffUserId && user.staffUserId !== 0) {
        throw new BadRequestException(
          'staffUserId is required for STAFF users',
        );
      }

      const offerings = await this.prisma.course_offerings.findMany({
        where: {
          course_instructors: {
            some: {
              staff_users_id: user.staffUserId,
            },
          },
        },
        select: courseOfferingSelect,
        orderBy: [{ academic_year: 'desc' }, { semester: 'desc' }],
      });

      return serializeBigInt(offerings);
    }

    if (user.type === 'STUDENT') {
      if (!user.studentCode) {
        throw new BadRequestException(
          'studentCode is required for STUDENT users',
        );
      }

      const offerings = await this.prisma.course_offerings.findMany({
        where: {
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

  async findOneById(offeringId: string) {
    if (!offeringId || offeringId === 'undefined') {
      throw new BadRequestException('Invalid course_offerings_id');
    }

    const id = BigInt(offeringId);

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

  async addStudentToOffering(offeringId: string, dto: AddStudentDto) {
    const offeringBigInt = BigInt(offeringId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Ensure student exists (or create)
      const student = await tx.students.upsert({
        where: { student_code: dto.student_code },
        update: {
          email: dto.email,
          first_name: dto.first_name,
          last_name: dto.last_name,
        },
        create: {
          student_code: dto.student_code,
          email: dto.email,
          password_hash: '12345678', // 🔒 replace later with invite flow
          first_name: dto.first_name,
          last_name: dto.last_name,
        },
      });

      // 2. Enroll student (unique constraint prevents duplicates)
      await tx.course_enrollments.create({
        data: {
          course_offerings_id: offeringBigInt,
          student_code: student.student_code,
        },
      });

      return {
        success: true,
      };
    });
  }

  async getStudentsByOffering(offeringId: string) {
    const id = BigInt(offeringId);

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
    }));
  }

  /**
   * Bulk enroll students into a course offering
   * Each row is processed in its own transaction for fault isolation
   */
  async bulkEnrollStudents(
    offeringId: string,
    dto: BulkEnrollStudentDto,
  ): Promise<BulkEnrollResponse> {
    const offeringBigInt = BigInt(offeringId);
    const results: BulkEnrollRowResult[] = [];

    for (const row of dto.students) {
      try {
        const result = await this.processStudentRow(offeringBigInt, row);
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

    return {
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
  }

  /**
   * Process a single student row in a transaction
   */
  private async processStudentRow(
    offeringBigInt: bigint,
    row: BulkEnrollStudentRowDto,
  ): Promise<BulkEnrollRowResult> {
    return this.prisma.$transaction(async (tx) => {
      let directoryAction: 'created' | 'updated' | 'unchanged' = 'unchanged';

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
          first_name: row.first_name,
          last_name: row.last_name,
        },
        create: {
          student_code: row.student_code,
          email: row.email,
          password_hash: '12345678', // Placeholder for invite flow
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
}
