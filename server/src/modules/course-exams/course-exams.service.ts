import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
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

export type ExamStatus = 'UPCOMING' | 'ONGOING' | 'ENDED';

function computeStatus(start: Date, end: Date, now = new Date()): ExamStatus {
  if (now < start) return 'UPCOMING';
  if (now <= end) return 'ONGOING';
  return 'ENDED';
}

@Injectable()
export class CourseExamsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve offering -> courses_id and authorize the actor.
   * ADMIN bypasses; INSTRUCTOR must teach any offering of this course.
   */
  private async resolveCourseAndAuthorize(
    offeringId: string,
    actor: StaffActor,
  ): Promise<bigint> {
    const offering = await this.prisma.course_offerings.findUnique({
      where: { course_offerings_id: BigInt(offeringId) },
      select: { courses_id: true },
    });
    if (!offering) throw new NotFoundException('Course offering not found');

    if (actor.role === 'ADMIN') return offering.courses_id;

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
   * Verify every given question id belongs to the given course (via its
   * collection's year folder). Returns the bigint ids in input order.
   */
  private async validateQuestionsInCourse(
    questionIds: string[],
    coursesId: bigint,
  ): Promise<bigint[]> {
    const asBig = questionIds.map((id) => BigInt(id));
    const rows = await this.prisma.question_bank.findMany({
      where: {
        question_id: { in: asBig },
        is_active: true,
        question_collections: {
          is: {
            is_active: true,
            question_bank_years: { is: { courses_id: coursesId } },
          },
        },
      },
      select: { question_id: true },
    });
    if (rows.length !== asBig.length) {
      throw new BadRequestException(
        'One or more questions do not belong to this course or are inactive',
      );
    }
    return asBig;
  }

  // ======================== CREATE ========================

  async create(offeringId: string, dto: CreateExamDto, actor: StaffActor) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);

    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('Title is required');
    }

    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start_time or end_time');
    }
    if (start >= end) {
      throw new BadRequestException('start_time must be before end_time');
    }
    // Allow a small clock-skew tolerance (60 seconds in the past is OK).
    const now = Date.now();
    if (start.getTime() < now - 60_000) {
      throw new BadRequestException('start_time cannot be in the past');
    }

    if (!Array.isArray(dto.question_ids) || dto.question_ids.length < 1) {
      throw new BadRequestException('At least 1 question is required');
    }
    // Preserve user-chosen order but drop duplicates.
    const seen = new Set<string>();
    const uniqueQids = dto.question_ids.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const validatedIds = await this.validateQuestionsInCourse(
      uniqueQids,
      coursesId,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const exam = await tx.course_exams.create({
        data: {
          course_offerings_id: BigInt(offeringId),
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          start_time: start,
          end_time: end,
          show_results_immediately: dto.show_results_immediately,
        },
        select: { course_exams_id: true },
      });
      await tx.exam_questions.createMany({
        data: validatedIds.map((qid, idx) => ({
          course_exams_id: exam.course_exams_id,
          question_id: qid,
          sequence_index: idx,
        })),
      });
      return exam;
    });

    return serializeBigInt({
      course_exams_id: created.course_exams_id,
    });
  }

  // ======================== LIST ========================

  /** All exams of the offering, ordered by start_time ascending. */
  async listByOffering(offeringId: string, actor: StaffActor) {
    await this.resolveCourseAndAuthorize(offeringId, actor);

    const rows = await this.prisma.course_exams.findMany({
      where: {
        course_offerings_id: BigInt(offeringId),
        is_active: true,
      },
      orderBy: { start_time: 'asc' },
      select: {
        course_exams_id: true,
        title: true,
        description: true,
        start_time: true,
        end_time: true,
        show_results_immediately: true,
        created_at: true,
        updated_at: true,
        _count: { select: { exam_questions: true } },
      },
    });

    const now = new Date();
    const data = rows.map((e) => ({
      course_exams_id: e.course_exams_id,
      title: e.title,
      description: e.description,
      start_time: e.start_time,
      end_time: e.end_time,
      show_results_immediately: e.show_results_immediately,
      question_count: e._count.exam_questions,
      status: computeStatus(e.start_time, e.end_time, now),
      created_at: e.created_at,
      updated_at: e.updated_at,
    }));

    return serializeBigInt(data);
  }

  // ======================== DETAIL ========================

  async getById(offeringId: string, examId: string, actor: StaffActor) {
    await this.resolveCourseAndAuthorize(offeringId, actor);

    const exam = await this.prisma.course_exams.findUnique({
      where: { course_exams_id: BigInt(examId) },
      select: {
        course_exams_id: true,
        course_offerings_id: true,
        is_active: true,
        title: true,
        description: true,
        start_time: true,
        end_time: true,
        show_results_immediately: true,
        exam_questions: {
          orderBy: { sequence_index: 'asc' },
          select: {
            sequence_index: true,
            question_bank: {
              select: {
                question_id: true,
                question_text: true,
                question_type: true,
                difficulty_param: true,
                discrimination_param: true,
                guessing_param: true,
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
            },
          },
        },
      },
    });

    if (!exam || !exam.is_active) throw new NotFoundException('Exam not found');
    if (exam.course_offerings_id.toString() !== offeringId) {
      throw new ForbiddenException('Exam does not belong to this offering');
    }

    const questions = exam.exam_questions.map((eq) => ({
      sequence_index: eq.sequence_index,
      ...eq.question_bank,
      knowledge_categories: eq.question_bank.question_knowledge.map(
        (k) => k.knowledge_categories,
      ),
      question_knowledge: undefined,
    }));

    return serializeBigInt({
      course_exams_id: exam.course_exams_id,
      title: exam.title,
      description: exam.description,
      start_time: exam.start_time,
      end_time: exam.end_time,
      show_results_immediately: exam.show_results_immediately,
      status: computeStatus(exam.start_time, exam.end_time),
      questions,
    });
  }

  // ======================== UPDATE ========================

  /**
   * Full-replace update. Re-runs create-time validation, updates core fields,
   * wipes exam_questions, and re-inserts them with fresh sequence_index to
   * preserve the user's chosen order. All inside a single transaction.
   */
  async update(
    offeringId: string,
    examId: string,
    dto: UpdateExamDto,
    actor: StaffActor,
  ) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);

    // Ensure exam exists, is active, and belongs to this offering.
    const existing = await this.prisma.course_exams.findUnique({
      where: { course_exams_id: BigInt(examId) },
      select: {
        course_offerings_id: true,
        is_active: true,
      },
    });
    if (!existing || !existing.is_active) {
      throw new NotFoundException('Exam not found');
    }
    if (existing.course_offerings_id.toString() !== offeringId) {
      throw new ForbiddenException('Exam does not belong to this offering');
    }

    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('Title is required');
    }

    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start_time or end_time');
    }
    if (start >= end) {
      throw new BadRequestException('start_time must be before end_time');
    }

    if (!Array.isArray(dto.question_ids) || dto.question_ids.length < 1) {
      throw new BadRequestException('At least 1 question is required');
    }
    const seen = new Set<string>();
    const uniqueQids = dto.question_ids.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const validatedIds = await this.validateQuestionsInCourse(
      uniqueQids,
      coursesId,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.course_exams.update({
        where: { course_exams_id: BigInt(examId) },
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          start_time: start,
          end_time: end,
          show_results_immediately: dto.show_results_immediately,
        },
      });
      await tx.exam_questions.deleteMany({
        where: { course_exams_id: BigInt(examId) },
      });
      await tx.exam_questions.createMany({
        data: validatedIds.map((qid, idx) => ({
          course_exams_id: BigInt(examId),
          question_id: qid,
          sequence_index: idx,
        })),
      });
    });

    return serializeBigInt({ course_exams_id: BigInt(examId) });
  }

  // ======================== SOFT DELETE ========================

  /**
   * Soft delete: flip is_active=false. Leaves exam_questions and
   * exam_attempts intact (audit / potential restore).
   */
  async softDelete(offeringId: string, examId: string, actor: StaffActor) {
    await this.resolveCourseAndAuthorize(offeringId, actor);

    const existing = await this.prisma.course_exams.findUnique({
      where: { course_exams_id: BigInt(examId) },
      select: { course_offerings_id: true, is_active: true },
    });
    if (!existing || !existing.is_active) {
      throw new NotFoundException('Exam not found');
    }
    if (existing.course_offerings_id.toString() !== offeringId) {
      throw new ForbiddenException('Exam does not belong to this offering');
    }

    await this.prisma.course_exams.update({
      where: { course_exams_id: BigInt(examId) },
      data: { is_active: false },
    });

    return { ok: true };
  }
}
