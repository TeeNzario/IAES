import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/prisma/client';

function serializeBigInt(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
}

type KnowledgeCategoryInput =
  | string
  | {
      name: string;
      code?: string;
    };

interface NormalizedKnowledgeCategoryInput {
  name: string;
  code: string;
}

const KNOWLEDGE_SUFFIX_PATTERN = /^K\d{3,}$/;

function defaultKnowledgeSuffix(index: number) {
  return `K${String(index + 1).padStart(3, '0')}`;
}

function knowledgeCodePrefix(courseCode: string) {
  return `${courseCode.trim().toUpperCase()}-`;
}

function extractKnowledgeSuffix(code: string) {
  return code.trim().toUpperCase().match(/K\d+$/)?.[0];
}

function formatKnowledgeCode(courseCode: string, suffix: string) {
  return `${knowledgeCodePrefix(courseCode)}${suffix}`;
}

function serializeCourseKnowledge(row: any) {
  return {
    ...row.knowledge_categories,
    code: row.code,
  };
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeKnowledgeInputs(
    inputs: KnowledgeCategoryInput[],
    courseCode: string,
  ): NormalizedKnowledgeCategoryInput[] {
    const seenCodes = new Set<string>();
    const seenNames = new Set<string>();
    const normalized: NormalizedKnowledgeCategoryInput[] = [];
    const prefix = knowledgeCodePrefix(courseCode);

    for (const input of inputs) {
      const name = (typeof input === 'string' ? input : input.name).trim();
      const rawCode =
        typeof input === 'string' ? undefined : input.code?.trim();

      if (!name) {
        throw new BadRequestException('ต้องระบุชื่อหมวดหมู่ความรู้');
      }

      const normalizedRawCode = rawCode?.toUpperCase() ?? '';
      const suffix =
        (normalizedRawCode.startsWith(prefix)
          ? normalizedRawCode.slice(prefix.length)
          : normalizedRawCode) || defaultKnowledgeSuffix(normalized.length);

      if (!suffix) {
        throw new BadRequestException('ต้องระบุรหัสหมวดหมู่ความรู้');
      }

      if (!KNOWLEDGE_SUFFIX_PATTERN.test(suffix)) {
        throw new BadRequestException(
          `รหัสหมวดหมู่ความรู้ต้องอยู่ในรูปแบบ ${prefix}K001`,
        );
      }

      const code = formatKnowledgeCode(courseCode, suffix);

      if (seenCodes.has(code)) {
        throw new BadRequestException(
          `รหัสหมวดหมู่ความรู้ ${code} ซ้ำในรายวิชานี้`,
        );
      }

      const nameKey = name.toLocaleLowerCase('th-TH');
      if (seenNames.has(nameKey)) {
        throw new BadRequestException(
          `ชื่อหมวดหมู่ความรู้ "${name}" ซ้ำในรายวิชานี้`,
        );
      }

      seenCodes.add(code);
      seenNames.add(nameKey);
      normalized.push({ name, code });
    }

    return normalized;
  }

  private async upsertCourseKnowledge(
    tx: Prisma.TransactionClient,
    courseId: bigint,
    courseCode: string,
    inputs: KnowledgeCategoryInput[],
    instructorId: string,
  ) {
    const categories = this.normalizeKnowledgeInputs(inputs, courseCode);

    await tx.course_knowledge.deleteMany({
      where: { courses_id: courseId },
    });

    for (const input of categories) {
      let category = await tx.knowledge_categories.findFirst({
        where: { name: input.name },
      });

      if (!category) {
        category = await tx.knowledge_categories.create({
          data: {
            name: input.name,
            created_by_staff_id: BigInt(instructorId),
          },
        });
      }

      await tx.course_knowledge.create({
        data: {
          courses_id: courseId,
          knowledge_category_id: category.knowledge_category_id,
          code: input.code,
        },
      });
    }
  }

  private async rewriteKnowledgeCodePrefix(
    tx: Prisma.TransactionClient,
    courseId: bigint,
    courseCode: string,
  ) {
    const links = await tx.course_knowledge.findMany({
      where: { courses_id: courseId },
      select: {
        knowledge_category_id: true,
        code: true,
      },
      orderBy: { code: 'asc' },
    });
    const usedCodes = new Set<string>();

    for (const [index, link] of links.entries()) {
      let suffix = extractKnowledgeSuffix(link.code) ?? defaultKnowledgeSuffix(index);
      let nextCode = formatKnowledgeCode(courseCode, suffix);
      let collisionIndex = index;

      while (usedCodes.has(nextCode)) {
        collisionIndex += 1;
        suffix = defaultKnowledgeSuffix(collisionIndex);
        nextCode = formatKnowledgeCode(courseCode, suffix);
      }

      usedCodes.add(nextCode);

      if (link.code !== nextCode) {
        await tx.course_knowledge.update({
          where: {
            courses_id_knowledge_category_id: {
              courses_id: courseId,
              knowledge_category_id: link.knowledge_category_id,
            },
          },
          data: { code: nextCode },
        });
      }
    }
  }

  async create(dto: CreateCourseDto, instructorId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create course
      // course_name is set to course_name_th for backward compatibility
      // (all existing UI code references course_name)
      const course = await tx.courses.create({
        data: {
          course_name: dto.course_name_th,
          course_name_th: dto.course_name_th,
          course_name_en: dto.course_name_en,
          course_code: dto.course_code,
          created_by_instructors_id: BigInt(instructorId),
        },
      });

      // 2. Handle knowledge categories
      if (dto.knowledge_categories && dto.knowledge_categories.length > 0) {
        await this.upsertCourseKnowledge(
          tx,
          course.courses_id,
          dto.course_code,
          dto.knowledge_categories,
          instructorId,
        );
      }

      // 3. Return course with knowledge categories
      return tx.courses.findUnique({
        where: { courses_id: course.courses_id },
        include: {
          course_knowledge: {
            orderBy: { code: 'asc' },
            include: {
              knowledge_categories: true,
            },
          },
        },
      });
    });

    return serializeBigInt(result);
  }

  async findAllByCreator(
    instructorId: string,
    page = 1,
    limit = 10,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const trimmedSearch = search?.trim();
    const where: Prisma.coursesWhereInput = {
      created_by_instructors_id: BigInt(instructorId),
      ...(trimmedSearch
        ? {
            OR: [
              {
                course_code: {
                  contains: trimmedSearch,
                  mode: 'insensitive',
                },
              },
              {
                course_name: {
                  contains: trimmedSearch,
                  mode: 'insensitive',
                },
              },
              {
                course_name_th: {
                  contains: trimmedSearch,
                  mode: 'insensitive',
                },
              },
              {
                course_name_en: {
                  contains: trimmedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [courses, total] = await Promise.all([
      this.prisma.courses.findMany({
        where,
        include: {
          course_knowledge: {
            orderBy: { code: 'asc' },
            select: {
              code: true,
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
        where,
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
          orderBy: { code: 'asc' },
          select: {
            code: true,
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

  async update(id: number, dto: UpdateCourseDto, instructorId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.courses.findUnique({
        where: { courses_id: BigInt(id) },
        select: { course_code: true },
      });
      const nextCourseCode = dto.course_code?.trim() || existing?.course_code;

      if (!nextCourseCode) {
        throw new BadRequestException('ไม่พบรหัสวิชาสำหรับรายวิชานี้');
      }

      // 1. Update basic course info
      // For backward compatibility: course_name mirrors course_name_th
      await tx.courses.update({
        where: { courses_id: BigInt(id) },
        data: {
          ...(dto.course_name && { course_name: dto.course_name }),
          ...(dto.course_name_th && {
            course_name: dto.course_name_th,
            course_name_th: dto.course_name_th,
          }),
          ...(dto.course_name_en && { course_name_en: dto.course_name_en }),
          ...(dto.course_code && { course_code: dto.course_code }),
        },
      });

      // 2. Handle knowledge categories if provided
      if (dto.knowledge_categories !== undefined) {
        await this.upsertCourseKnowledge(
          tx,
          BigInt(id),
          nextCourseCode,
          dto.knowledge_categories,
          instructorId,
        );
      } else if (
        dto.course_code &&
        existing?.course_code.trim().toUpperCase() !==
          dto.course_code.trim().toUpperCase()
      ) {
        await this.rewriteKnowledgeCodePrefix(tx, BigInt(id), nextCourseCode);
      }

      // 3. Return updated course with knowledge categories
      return tx.courses.findUnique({
        where: { courses_id: BigInt(id) },
        include: {
          course_knowledge: {
            orderBy: { code: 'asc' },
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
    // Check if course has any offerings
    const offeringsCount = await this.prisma.course_offerings.count({
      where: { courses_id: BigInt(id) },
    });

    if (offeringsCount > 0) {
      throw new ConflictException(
        'Cannot delete this course because course offerings already exist for this course.',
      );
    }

    await this.prisma.courses.delete({
      where: { courses_id: BigInt(id) },
    });

    return { success: true };
  }

  /**
   * Check if a course code already exists
   * @param code - The course code to check
   * @param excludeId - Optional course ID to exclude (for edit mode)
   * @returns true if exists, false otherwise
   */
  async checkCodeExists(code: string, excludeId?: number): Promise<boolean> {
    const existing = await this.prisma.courses.findFirst({
      where: {
        course_code: code.trim(),
        ...(excludeId ? { NOT: { courses_id: BigInt(excludeId) } } : {}),
      },
      select: { courses_id: true },
    });

    return existing !== null;
  }

  /**
   * Check if a course name already exists
   * @param name - The course name to check
   * @param excludeId - Optional course ID to exclude (for edit mode)
   * @returns true if exists, false otherwise
   */
  async checkNameExists(name: string, excludeId?: number): Promise<boolean> {
    const existing = await this.prisma.courses.findFirst({
      where: {
        OR: [
          { course_name: name.trim() },
          { course_name_th: name.trim() },
          { course_name_en: name.trim() },
        ],
        ...(excludeId ? { NOT: { courses_id: BigInt(excludeId) } } : {}),
      },
      select: { courses_id: true },
    });

    return existing !== null;
  }

  async getCourseKnowledgeCategories(courseId: number) {
    const course = await this.prisma.courses.findUnique({
      where: { courses_id: BigInt(courseId) },
      include: {
        course_knowledge: {
          orderBy: { code: 'asc' },
          select: {
            code: true,
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

    if (!course) return [];

    const serialized = serializeBigInt(course);
    return serialized.course_knowledge.map(serializeCourseKnowledge);
  }

  async updateKnowledgeCategories(
    courseId: number,
    categories: KnowledgeCategoryInput[],
    instructorId: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const course = await tx.courses.findUnique({
        where: { courses_id: BigInt(courseId) },
        select: { course_code: true },
      });

      if (!course) {
        throw new BadRequestException('ไม่พบรายวิชานี้');
      }

      await this.upsertCourseKnowledge(
        tx,
        BigInt(courseId),
        course.course_code,
        categories,
        instructorId,
      );

      // Return updated course with knowledge categories
      return tx.courses.findUnique({
        where: { courses_id: BigInt(courseId) },
        include: {
          course_knowledge: {
            orderBy: { code: 'asc' },
            include: {
              knowledge_categories: true,
            },
          },
        },
      });
    });

    return serializeBigInt(result);
  }
}
