import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BulkCreateQuestionsDto, CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import type { StaffRole } from 'src/auth/types/jwt-payload.type';

function serializeBigInt<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
}

interface StaffActor {
  staffUserId: string;
  role: StaffRole;
}

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve offering -> courses_id and authorize the actor.
   * ADMIN bypasses; INSTRUCTOR must teach any offering of the course.
   */
  private async resolveCourseAndAuthorize(
    offeringId: string,
    actor: StaffActor,
  ): Promise<bigint> {
    const offering = await this.prisma.course_offerings.findUnique({
      where: { course_offerings_id: BigInt(offeringId) },
      select: { courses_id: true },
    });

    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    if (actor.role === 'ADMIN') {
      return offering.courses_id;
    }

    const link = await this.prisma.course_instructors.findFirst({
      where: {
        staff_users_id: BigInt(actor.staffUserId),
        course_offerings: { courses_id: offering.courses_id },
      },
      select: { staff_users_id: true },
    });

    if (!link) {
      throw new ForbiddenException('You are not an instructor of this course');
    }

    return offering.courses_id;
  }

  /**
   * Verify that a collection belongs to the given course via its year folder.
   * Returns the collection row.
   */
  private async getCollectionInCourse(
    collectionId: string,
    coursesId: bigint,
  ) {
    const collection = await this.prisma.question_collections.findUnique({
      where: { question_collection_id: BigInt(collectionId) },
      select: {
        question_collection_id: true,
        is_active: true,
        question_bank_years: {
          select: { courses_id: true },
        },
      },
    });

    if (!collection || !collection.is_active) {
      throw new NotFoundException('Collection not found');
    }
    if (collection.question_bank_years.courses_id !== coursesId) {
      throw new ForbiddenException('Collection does not belong to this course');
    }
    return collection;
  }

  /**
   * Enforce single-correct MCQ rules on a list of choices.
   * Throws BadRequestException with a caller-supplied question label.
   */
  private enforceSingleCorrect(
    choices: { choice_text: string; is_correct: boolean }[],
    label: string,
  ) {
    if (choices.length < 2) {
      throw new BadRequestException(
        `${label}: must have at least 2 choices`,
      );
    }
    if (choices.some((c) => !c.choice_text || !c.choice_text.trim())) {
      throw new BadRequestException(`${label}: choice text cannot be empty`);
    }
    const correctCount = choices.filter((c) => c.is_correct).length;
    if (correctCount !== 1) {
      throw new BadRequestException(
        `${label}: exactly 1 choice must be marked correct`,
      );
    }
  }

  /**
   * Validate that every tag id is a knowledge category linked to the course
   * via course_knowledge. Rejects unknown tags. Returns the bigint ids.
   */
  private async validateTagIds(
    coursesId: bigint,
    tagIds: string[],
  ): Promise<bigint[]> {
    if (tagIds.length === 0) return [];
    const asBig = tagIds.map((id) => BigInt(id));
    const rows = await this.prisma.course_knowledge.findMany({
      where: {
        courses_id: coursesId,
        knowledge_category_id: { in: asBig },
      },
      select: { knowledge_category_id: true },
    });
    if (rows.length !== asBig.length) {
      throw new BadRequestException(
        'One or more knowledge tags are not part of this course',
      );
    }
    return asBig;
  }

  // ======================== LIST ========================

  async listByCollection(
    offeringId: string,
    collectionId: string,
    actor: StaffActor,
    opts: { page?: number; limit?: number; search?: string } = {},
  ) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);
    await this.getCollectionInCourse(collectionId, coursesId);

    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;
    const search = opts.search?.trim();

    const where = {
      question_collection_id: BigInt(collectionId),
      is_active: true,
      ...(search
        ? { question_text: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.question_bank.findMany({
        where,
        orderBy: { created_at: 'asc' },
        skip,
        take: limit,
        select: {
          question_id: true,
          question_text: true,
          question_type: true,
          difficulty_param: true,
          discrimination_param: true,
          guessing_param: true,
          created_at: true,
          updated_at: true,
          choices: {
            orderBy: { display_order: 'asc' },
            select: {
              choice_id: true,
              choice_text: true,
              is_correct: true,
              display_order: true,
            },
          },
          question_knowledge: {
            select: {
              knowledge_categories: {
                select: { knowledge_category_id: true, name: true },
              },
            },
          },
        },
      }),
      this.prisma.question_bank.count({ where }),
    ]);

    const data = items.map((q) => ({
      ...q,
      knowledge_categories: q.question_knowledge.map(
        (k) => k.knowledge_categories,
      ),
      question_knowledge: undefined,
    }));

    return serializeBigInt({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  /**
   * Course-wide question listing for the exam-picker modal.
   * Scopes strictly to questions that belong to this course (via their
   * collection's year folder). Optional filters: academic year + collection.
   */
  async listAllInCourse(
    offeringId: string,
    actor: StaffActor,
    opts: {
      page?: number;
      limit?: number;
      search?: string;
      year?: number;
      collection_id?: string;
      category_ids?: string[];
    } = {},
  ) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);

    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;
    const search = opts.search?.trim();
    const categoryIds = opts.category_ids?.filter(Boolean) ?? [];

    // Build nested filter: question -> collection -> year -> course.
    const where = {
      is_active: true,
      question_collections: {
        is: {
          is_active: true,
          ...(opts.collection_id
            ? { question_collection_id: BigInt(opts.collection_id) }
            : {}),
          question_bank_years: {
            is: {
              courses_id: coursesId,
              ...(opts.year ? { academic_year: opts.year } : {}),
            },
          },
        },
      },
      ...(search
        ? { question_text: { contains: search, mode: 'insensitive' as const } }
        : {}),
      ...(categoryIds.length > 0
        ? {
            question_knowledge: {
              some: {
                knowledge_category_id: {
                  in: categoryIds.map((id) => BigInt(id)),
                },
              },
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.question_bank.findMany({
        where,
        orderBy: { created_at: 'asc' },
        skip,
        take: limit,
        select: {
          question_id: true,
          question_text: true,
          question_type: true,
          difficulty_param: true,
          discrimination_param: true,
          guessing_param: true,
          created_at: true,
          updated_at: true,
          question_collections: {
            select: {
              question_collection_id: true,
              title: true,
              question_bank_years: {
                select: { academic_year: true },
              },
            },
          },
          choices: {
            orderBy: { display_order: 'asc' },
            select: {
              choice_id: true,
              choice_text: true,
              is_correct: true,
              display_order: true,
            },
          },
          question_knowledge: {
            select: {
              knowledge_categories: {
                select: { knowledge_category_id: true, name: true },
              },
            },
          },
        },
      }),
      this.prisma.question_bank.count({ where }),
    ]);

    const data = items.map((q) => ({
      question_id: q.question_id,
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty_param: q.difficulty_param,
      discrimination_param: q.discrimination_param,
      guessing_param: q.guessing_param,
      created_at: q.created_at,
      updated_at: q.updated_at,
      collection: q.question_collections
        ? {
            question_collection_id:
              q.question_collections.question_collection_id,
            title: q.question_collections.title,
            academic_year:
              q.question_collections.question_bank_years.academic_year,
          }
        : null,
      choices: q.choices,
      knowledge_categories: q.question_knowledge.map(
        (k) => k.knowledge_categories,
      ),
    }));

    return serializeBigInt({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  // ======================== BULK CREATE ========================

  async bulkCreate(
    offeringId: string,
    collectionId: string,
    dto: BulkCreateQuestionsDto,
    actor: StaffActor,
  ) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);
    await this.getCollectionInCourse(collectionId, coursesId);

    // All-or-nothing validation: first invalid question rejects entire batch.
    for (const [idx, q] of dto.questions.entries()) {
      const label = `Question ${idx + 1}`;
      if (!q.question_text || !q.question_text.trim()) {
        throw new BadRequestException(`${label}: question text is required`);
      }
      this.enforceSingleCorrect(q.choices, label);
      for (const [key, val] of [
        ['difficulty_param', q.difficulty_param],
        ['discrimination_param', q.discrimination_param],
        ['guessing_param', q.guessing_param],
      ] as const) {
        if (typeof val !== 'number' || !Number.isFinite(val)) {
          throw new BadRequestException(`${label}: ${key} is required`);
        }
      }
      if (
        !Array.isArray(q.knowledge_category_ids) ||
        q.knowledge_category_ids.length < 1
      ) {
        throw new BadRequestException(
          `${label}: at least 1 knowledge tag is required`,
        );
      }
    }

    // Pre-validate all tag references up front (single round-trip).
    const allTagIds = Array.from(
      new Set(dto.questions.flatMap((q) => q.knowledge_category_ids)),
    );
    await this.validateTagIds(coursesId, allTagIds);

    const created = await this.prisma.$transaction(async (tx) => {
      const results: bigint[] = [];
      for (const q of dto.questions) {
        const inserted = await tx.question_bank.create({
          data: {
            question_text: q.question_text.trim(),
            // All newly created questions are single-correct MCQ only.
            question_type: 'MCQ_SINGLE',
            difficulty_param: q.difficulty_param,
            discrimination_param: q.discrimination_param,
            guessing_param: q.guessing_param,
            question_collection_id: BigInt(collectionId),
            created_by_staff_id: BigInt(actor.staffUserId),
            choices: {
              create: q.choices.map((c, idx) => ({
                choice_text: c.choice_text.trim(),
                is_correct: c.is_correct,
                display_order: c.display_order ?? idx,
              })),
            },
            question_knowledge: {
              create: q.knowledge_category_ids.map((tagId) => ({
                knowledge_category_id: BigInt(tagId),
                courses_id: coursesId,
              })),
            },
          },
          select: { question_id: true },
        });
        results.push(inserted.question_id);
      }
      return results;
    });

    return serializeBigInt({
      created_count: created.length,
      question_ids: created,
    });
  }

  // ======================== UPDATE ========================

  async update(
    offeringId: string,
    questionId: string,
    dto: UpdateQuestionDto,
    actor: StaffActor,
  ) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);

    // Load existing row WITH choices + tags so we can validate the post-merge
    // state and never let the row become invalid.
    const existing = await this.prisma.question_bank.findUnique({
      where: { question_id: BigInt(questionId) },
      select: {
        question_id: true,
        question_text: true,
        question_collection_id: true,
        is_active: true,
        difficulty_param: true,
        discrimination_param: true,
        guessing_param: true,
        choices: {
          orderBy: { display_order: 'asc' },
          select: { choice_text: true, is_correct: true },
        },
        question_knowledge: {
          select: { knowledge_category_id: true },
        },
        question_collections: {
          select: {
            question_bank_years: { select: { courses_id: true } },
          },
        },
      },
    });

    if (!existing || !existing.is_active) {
      throw new NotFoundException('Question not found');
    }
    const qCoursesId =
      existing.question_collections?.question_bank_years.courses_id;
    if (!qCoursesId || qCoursesId !== coursesId) {
      throw new ForbiddenException('Question does not belong to this course');
    }

    // Per-field structural checks (cheap, before merge).
    for (const [key, val] of [
      ['difficulty_param', dto.difficulty_param],
      ['discrimination_param', dto.discrimination_param],
      ['guessing_param', dto.guessing_param],
    ] as const) {
      if (val !== undefined && (typeof val !== 'number' || !Number.isFinite(val))) {
        throw new BadRequestException(`${key} must be a finite number`);
      }
    }

    // ---- POST-MERGE FULL VALIDATION (Q2: strict) ----
    const mergedText =
      dto.question_text !== undefined
        ? dto.question_text.trim()
        : existing.question_text;
    const mergedChoices = dto.choices ?? existing.choices;
    const mergedDifficulty =
      dto.difficulty_param !== undefined
        ? dto.difficulty_param
        : existing.difficulty_param;
    const mergedDiscrimination =
      dto.discrimination_param !== undefined
        ? dto.discrimination_param
        : existing.discrimination_param;
    const mergedGuessing =
      dto.guessing_param !== undefined
        ? dto.guessing_param
        : existing.guessing_param;
    const mergedTagIds =
      dto.knowledge_category_ids ??
      existing.question_knowledge.map((k) =>
        k.knowledge_category_id.toString(),
      );

    if (!mergedText || !mergedText.trim()) {
      throw new BadRequestException('Question: question text is required');
    }
    this.enforceSingleCorrect(mergedChoices, 'Question');
    for (const [key, val] of [
      ['difficulty_param', mergedDifficulty],
      ['discrimination_param', mergedDiscrimination],
      ['guessing_param', mergedGuessing],
    ] as const) {
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        throw new BadRequestException(`Question: ${key} is required`);
      }
    }
    if (!Array.isArray(mergedTagIds) || mergedTagIds.length < 1) {
      throw new BadRequestException(
        'Question: at least 1 knowledge tag is required',
      );
    }

    let validatedTagIds: bigint[] | undefined;
    if (dto.knowledge_category_ids) {
      validatedTagIds = await this.validateTagIds(
        coursesId,
        dto.knowledge_category_ids,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.question_bank.update({
        where: { question_id: BigInt(questionId) },
        data: {
          ...(dto.question_text !== undefined
            ? { question_text: dto.question_text.trim() }
            : {}),
          // question_type is always forced to MCQ_SINGLE; incoming value ignored.
          ...(dto.question_type !== undefined
            ? { question_type: 'MCQ_SINGLE' as const }
            : {}),
          ...(dto.difficulty_param !== undefined
            ? { difficulty_param: dto.difficulty_param }
            : {}),
          ...(dto.discrimination_param !== undefined
            ? { discrimination_param: dto.discrimination_param }
            : {}),
          ...(dto.guessing_param !== undefined
            ? { guessing_param: dto.guessing_param }
            : {}),
          updated_at: new Date(),
        },
      });

      if (dto.choices) {
        await tx.question_choices.deleteMany({
          where: { question_id: BigInt(questionId) },
        });
        await tx.question_choices.createMany({
          data: dto.choices.map((c, idx) => ({
            question_id: BigInt(questionId),
            choice_text: c.choice_text.trim(),
            is_correct: c.is_correct,
            display_order: c.display_order ?? idx,
          })),
        });
      }

      if (validatedTagIds) {
        await tx.question_knowledge.deleteMany({
          where: { question_id: BigInt(questionId) },
        });
        await tx.question_knowledge.createMany({
          data: validatedTagIds.map((tagId) => ({
            question_id: BigInt(questionId),
            knowledge_category_id: tagId,
            courses_id: coursesId,
          })),
        });
      }

      return tx.question_bank.findUnique({
        where: { question_id: BigInt(questionId) },
        include: {
          choices: { orderBy: { display_order: 'asc' } },
          question_knowledge: { include: { knowledge_categories: true } },
        },
      });
    });

    return serializeBigInt(updated);
  }

  // ======================== SOFT DELETE ========================

  async softDelete(
    offeringId: string,
    questionId: string,
    actor: StaffActor,
  ) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);

    const existing = await this.prisma.question_bank.findUnique({
      where: { question_id: BigInt(questionId) },
      select: {
        question_id: true,
        is_active: true,
        question_collections: {
          select: { question_bank_years: { select: { courses_id: true } } },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Question not found');
    }
    if (existing.question_collections?.question_bank_years.courses_id !==
      coursesId) {
      throw new ForbiddenException('Question does not belong to this course');
    }

    await this.prisma.question_bank.update({
      where: { question_id: BigInt(questionId) },
      data: { is_active: false, updated_at: new Date() },
    });

    return { success: true };
  }

  // ======================== TAGS PROXY ========================

  async listCourseTags(offeringId: string, actor: StaffActor) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);

    const rows = await this.prisma.course_knowledge.findMany({
      where: { courses_id: coursesId },
      select: {
        knowledge_categories: {
          select: { knowledge_category_id: true, name: true },
        },
      },
    });

    return serializeBigInt(rows.map((r) => r.knowledge_categories));
  }
}
