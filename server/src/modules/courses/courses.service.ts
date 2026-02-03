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

  async findAllByCreator(instructorId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      this.prisma.courses.findMany({
        where: {
          created_by_instructors_id: BigInt(instructorId),
        },
        include: {
          course_knowledge: {
            include: {
              knowledge_categories: {
                select: {
                  knowledge_category_id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.courses.count({
        where: {
          created_by_instructors_id: BigInt(instructorId),
        },
      }),
    ]);

    return serializeBigInt({
      data: courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async findOne(id: number) {
    const course = await this.prisma.courses.findUnique({
      where: { courses_id: BigInt(id) },
      include: {
        course_knowledge: {
          include: {
            knowledge_categories: {
              select: {
                knowledge_category_id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return serializeBigInt(course);
  }

  async update(id: number, dto: UpdateCourseDto, instructorId: number) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update basic course info
      await tx.courses.update({
        where: { courses_id: BigInt(id) },
        data: {
          course_name: dto.course_name,
          course_code: dto.course_code,
        },
      });

      // 2. Handle knowledge categories if provided
      if (dto.knowledge_categories !== undefined) {
        // Delete all existing relations
        await tx.course_knowledge.deleteMany({
          where: { courses_id: BigInt(id) },
        });

        // Create new relations
        for (const categoryName of dto.knowledge_categories) {
          // Find or create category
          let category = await tx.knowledge_categories.findFirst({
            where: { name: categoryName },
          });

          if (!category) {
            category = await tx.knowledge_categories.create({
              data: {
                name: categoryName,
                created_by_staff_id: BigInt(instructorId),
              },
            });
          }

          // Create relation
          await tx.course_knowledge.create({
            data: {
              courses_id: BigInt(id),
              knowledge_category_id: category.knowledge_category_id,
            },
          });
        }
      }

      // 3. Return updated course with knowledge categories
      return tx.courses.findUnique({
        where: { courses_id: BigInt(id) },
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

  async updateStatus(id: number, isActive: boolean) {
    const course = await this.prisma.courses.update({
      where: { courses_id: BigInt(id) },
      data: { is_active: isActive },
    });

    return serializeBigInt(course);
  }

  async remove(id: number) {
    await this.prisma.courses.delete({
      where: { courses_id: BigInt(id) },
    });

    return { success: true };
  }
}
