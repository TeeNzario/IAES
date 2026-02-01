import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCourseOfferingDto } from './dto/create-course-offerings.dto';

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

  async findByInstructor(staffUserId: number) {
    const offerings = await this.prisma.course_offerings.findMany({
      where: {
        course_instructors: {
          some: {
            staff_users_id: staffUserId,
          },
        },
      },
      select: courseOfferingSelect,
      orderBy: [{ academic_year: 'desc' }, { semester: 'desc' }],
    });

    return serializeBigInt(offerings);
  }
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
}
