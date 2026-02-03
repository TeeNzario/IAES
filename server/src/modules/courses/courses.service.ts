import { Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from 'src/prisma/prisma.service';

function serializeBigInt(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto, instructor_id: number) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create course
      const course = await tx.courses.create({
        data: {
          course_name: dto.course_name,
          course_code: dto.course_code,
          created_by_instructors_id: BigInt(instructor_id),
        },
      });

      // 2. Handle knowledge categories
      if (dto.knowledge_categories && dto.knowledge_categories.length > 0) {
        for (const categoryName of dto.knowledge_categories) {
          // Find or create category
          let category = await tx.knowledge_categories.findFirst({
            where: { name: categoryName },
          });

          if (!category) {
            category = await tx.knowledge_categories.create({
              data: {
                name: categoryName,
                created_by_staff_id: BigInt(instructor_id),
              },
            });
          }

          // Create relation
          await tx.course_knowledge.create({
            data: {
              courses_id: course.courses_id,
              knowledge_category_id: category.knowledge_category_id,
            },
          });
        }
      }

      // 3. Return course with knowledge categories
      return tx.courses.findUnique({
        where: { courses_id: course.courses_id },
        include: {
          course_knowledge: {
            include: {
              knowledge_categories: true,
            },
          },
        },
      });
    });

    return serializeBigInt(result);
  }

  async findAllByCreator(instructorId: number) {
    const courses = await this.prisma.courses.findMany({
      where: {
        created_by_instructors_id: BigInt(instructorId),
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return serializeBigInt(courses);
  }

  findOne(id: number) {
    return `This action returns a #${id} course`;
  }

  update(id: number, updateCourseDto: UpdateCourseDto) {
    return `This action updates a #${id} course`;
  }

  remove(id: number) {
    return `This action removes a #${id} course`;
  }
}
