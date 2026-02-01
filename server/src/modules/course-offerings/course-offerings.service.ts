import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCourseOfferingDto } from './dto/create-course-offerings.dto';

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
      const courseId = BigInt(dto.courses_id)

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
}
