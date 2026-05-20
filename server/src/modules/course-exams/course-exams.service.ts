import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import type { JwtPayload, StaffRole } from 'src/auth/types/jwt-payload.type';
import { MIN_ADAPTIVE_ITEM_BANK_SIZE } from 'src/modules/exam-attempts/adaptive/adaptive-selector';
import {
  FIXED_GUESSING_PARAM,
  QUESTION_PARAM_LIMITS,
} from 'src/lib/question-param-limits';

function replaceBigInt(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

function serializeBigInt<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, replaceBigInt)) as T;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFixedGuessingParam(value: number | null) {
  return (
    isFiniteNumber(value) &&
    Math.abs(value - FIXED_GUESSING_PARAM) <= Number.EPSILON
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

  private validateAdaptiveQuestionConfig(question: {
    question_id: bigint;
    question_type: string;
    difficulty_param: number | null;
    discrimination_param: number | null;
    guessing_param: number | null;
    choices: { is_correct: boolean }[];
    question_knowledge: { knowledge_category_id: bigint }[];
  }) {
    const label = `Question ${question.question_id.toString()}`;
    const { difficulty, discrimination } = QUESTION_PARAM_LIMITS;

    if (
      !isFiniteNumber(question.difficulty_param) ||
      question.difficulty_param < difficulty.min ||
      question.difficulty_param > difficulty.max ||
      !isFiniteNumber(question.discrimination_param) ||
      question.discrimination_param < discrimination.min ||
      question.discrimination_param > discrimination.max ||
      !isFixedGuessingParam(question.guessing_param)
    ) {
      throw new BadRequestException(
        `${label}: invalid IRT parameters for adaptive exam`,
      );
    }

    if (question.question_knowledge.length < 1) {
      throw new BadRequestException(
        `${label}: at least 1 knowledge tag is required`,
      );
    }

    if (question.choices.length < 2) {
      throw new BadRequestException(`${label}: must have at least 2 choices`);
    }

    const correctCount = question.choices.filter(
      (choice) => choice.is_correct,
    ).length;
    if (question.question_type === 'MCQ_MULTI') {
      if (correctCount < 1) {
        throw new BadRequestException(
          `${label}: at least 1 choice must be marked correct`,
        );
      }
      return;
    }

    if (correctCount !== 1) {
      throw new BadRequestException(
        `${label}: exactly 1 choice must be marked correct`,
      );
    }
  }

  /**
   * Verify every given question id belongs to the given course (via its
   * collection's year folder). Returns the bigint ids in input order.
   */
  private async validateQuestionsInCourse(
    questionIds: string[],
    coursesId: bigint,
  ): Promise<bigint[]> {
    if (questionIds.length < MIN_ADAPTIVE_ITEM_BANK_SIZE) {
      throw new BadRequestException(
        `At least ${MIN_ADAPTIVE_ITEM_BANK_SIZE} questions are required for adaptive IRT exams`,
      );
    }

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
      select: {
        question_id: true,
        question_type: true,
        difficulty_param: true,
        discrimination_param: true,
        guessing_param: true,
        choices: {
          select: { is_correct: true },
        },
        question_knowledge: {
          select: { knowledge_category_id: true },
        },
      },
    });
    if (rows.length !== asBig.length) {
      throw new BadRequestException(
        'One or more questions do not belong to this course or are inactive',
      );
    }
    rows.forEach((question) => this.validateAdaptiveQuestionConfig(question));
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

    if (
      !Array.isArray(dto.question_ids) ||
      dto.question_ids.length < MIN_ADAPTIVE_ITEM_BANK_SIZE
    ) {
      throw new BadRequestException(
        `At least ${MIN_ADAPTIVE_ITEM_BANK_SIZE} questions are required`,
      );
    }
    // Preserve user-chosen order but drop duplicates.
    const seen = new Set<string>();
    const uniqueQids = dto.question_ids.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (uniqueQids.length < MIN_ADAPTIVE_ITEM_BANK_SIZE) {
      throw new BadRequestException(
        `At least ${MIN_ADAPTIVE_ITEM_BANK_SIZE} unique questions are required`,
      );
    }
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
          show_results_immediately: dto.show_results_immediately ?? false,
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

  /**
   * Verify a student is enrolled in the given offering.
   */
  private async verifyStudentEnrollment(
    offeringId: string,
    studentCode: string,
  ) {
    const enrollment = await this.prisma.course_enrollments.findFirst({
      where: {
        course_offerings_id: BigInt(offeringId),
        students: {
          student_code: studentCode,
          is_active: true,
        },
      },
      select: { course_enrollments_id: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }
  }

  /**
   * All exams of the offering, ordered by start_time ascending.
   * By default returns only published exams. Pass includeDrafts=true
   * (staff only) to see unpublished exams too (used in exam-bank list).
   */
  async listByOffering(
    offeringId: string,
    user: JwtPayload,
    includeDrafts = false,
  ) {
    const isStaff = user.type === 'staff';
    if (isStaff) {
      await this.resolveCourseAndAuthorize(offeringId, {
        staffUserId: user.sub,
        role: user.role,
      });
    } else {
      await this.verifyStudentEnrollment(offeringId, user.sub);
    }

    // Students can never see unpublished exams regardless of query param
    const showDrafts = isStaff && includeDrafts;

    const rows = await this.prisma.course_exams.findMany({
      where: {
        course_offerings_id: BigInt(offeringId),
        is_active: true,
        ...(showDrafts ? {} : { is_published: true }),
      },
      orderBy: { start_time: 'asc' },
      select: {
        course_exams_id: true,
        title: true,
        description: true,
        start_time: true,
        end_time: true,
        show_results_immediately: true,
        is_published: true,
        created_at: true,
        updated_at: true,
        _count: { select: { exam_questions: true, exam_attempts: true } },
        exam_attempts: {
          where:
            user.type === 'student'
              ? { student_code: user.sub }
              : { student_code: '__staff_no_student_attempt__' },
          orderBy: { started_at: 'desc' },
          take: 1,
          select: {
            exam_attempts_id: true,
            status: true,
            submitted_at: true,
            total_score: true,
            passed: true,
          },
        },
        exam_questions: {
          orderBy: { sequence_index: 'asc' },
          select: {
            sequence_index: true,
            question_bank: {
              select: {
                question_id: true,
                difficulty_param: true,
                discrimination_param: true,
                guessing_param: true,
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

    const now = new Date();
    const data = rows.map((e) => {
      const attempt = e.exam_attempts[0] ?? null;
      const canViewResult =
        attempt?.status === 'SUBMITTED' &&
        (e.show_results_immediately || now > e.end_time);

      return {
        course_exams_id: e.course_exams_id,
        title: e.title,
        description: e.description,
        start_time: e.start_time,
        end_time: e.end_time,
        show_results_immediately: e.show_results_immediately,
        is_published: e.is_published,
        question_count: e._count.exam_questions,
        attempt_count: e._count.exam_attempts,
        status: computeStatus(e.start_time, e.end_time, now),
        created_at: e.created_at,
        updated_at: e.updated_at,
        attempt: attempt
          ? {
              attempt_id: attempt.exam_attempts_id,
              status: attempt.status,
              submitted_at: attempt.submitted_at,
              can_view_result: canViewResult,
              total_score: canViewResult ? attempt.total_score : null,
              passed: canViewResult ? attempt.passed : null,
            }
          : null,
        questions: e.exam_questions.map((eq) => ({
          sequence_index: eq.sequence_index,
          question_id: eq.question_bank.question_id,
          difficulty_param: eq.question_bank.difficulty_param,
          discrimination_param: eq.question_bank.discrimination_param,
          guessing_param: eq.question_bank.guessing_param,
          knowledge_categories: eq.question_bank.question_knowledge.map(
            (k) => k.knowledge_categories,
          ),
        })),
      };
    });

    return serializeBigInt(data);
  }

  // ======================== DETAIL ========================

  async getById(offeringId: string, examId: string, user: JwtPayload) {
    if (user.type === 'student') {
      await this.verifyStudentEnrollment(offeringId, user.sub);
    } else {
      await this.resolveCourseAndAuthorize(offeringId, {
        staffUserId: user.sub,
        role: user.role,
      });
    }

    const exam = await this.prisma.course_exams.findUnique({
      where: { course_exams_id: BigInt(examId) },
      select: {
        course_exams_id: true,
        course_offerings_id: true,
        is_active: true,
        is_published: true,
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

    // Students can only access published exams
    if (user.type !== 'staff' && !exam.is_published) {
      throw new NotFoundException('Exam not found');
    }
    if (user.type !== 'staff') {
      const now = new Date();
      if (now < exam.start_time || now > exam.end_time) {
        throw new BadRequestException('Exam is not open');
      }
    }

    const questions = exam.exam_questions.map((eq) => ({
      sequence_index: eq.sequence_index,
      ...eq.question_bank,
      choices:
        user.type === 'staff'
          ? eq.question_bank.choices
          : eq.question_bank.choices.map((choice) => ({
              choice_id: choice.choice_id,
              choice_text: choice.choice_text,
              display_order: choice.display_order,
            })),
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
    // Allow a small clock-skew tolerance (60 seconds in the past is OK).
    const now = Date.now();
    if (start.getTime() < now - 60_000) {
      throw new BadRequestException('start_time cannot be in the past');
    }

    if (
      !Array.isArray(dto.question_ids) ||
      dto.question_ids.length < MIN_ADAPTIVE_ITEM_BANK_SIZE
    ) {
      throw new BadRequestException(
        `At least ${MIN_ADAPTIVE_ITEM_BANK_SIZE} questions are required`,
      );
    }
    const seen = new Set<string>();
    const uniqueQids = dto.question_ids.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (uniqueQids.length < MIN_ADAPTIVE_ITEM_BANK_SIZE) {
      throw new BadRequestException(
        `At least ${MIN_ADAPTIVE_ITEM_BANK_SIZE} unique questions are required`,
      );
    }
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
          ...(dto.show_results_immediately !== undefined
            ? { show_results_immediately: dto.show_results_immediately }
            : {}),
          ...(dto.is_published !== undefined
            ? { is_published: dto.is_published }
            : {}),
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
