import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import type {
  JwtPayload,
  StaffRole,
  StudentJwtPayload,
} from 'src/auth/types/jwt-payload.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { BehaviorEventDto } from './dto/behavior-event.dto';
import {
  adaptiveRules,
  evaluateStopRule,
  ExamQuestionCandidate,
  itemInformation,
  MIN_ADAPTIVE_ITEM_BANK_SIZE,
  pickNextQuestion,
  updateTheta,
} from './adaptive/adaptive-selector';
import {
  computePercentScore,
  didPass,
  isExactChoiceSelectionCorrect,
} from './scoring/scoring-engine';
import {
  FIXED_GUESSING_PARAM,
  QUESTION_PARAM_LIMITS,
} from 'src/lib/question-param-limits';

type DbClient = PrismaService | Prisma.TransactionClient;

interface StaffActor {
  staffUserId: string;
  role: StaffRole;
}

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

function parseBigIntId(value: string, label: string) {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new BadRequestException(`${label} must be a positive integer`);
  }
  return BigInt(normalized);
}

@Injectable()
export class ExamAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertStudent(user: JwtPayload): StudentJwtPayload {
    if (user.type !== 'student') {
      throw new ForbiddenException('Student access required');
    }
    return user;
  }

  private async verifyStudentEnrollment(
    offeringId: string,
    studentCode: string,
    client: DbClient = this.prisma,
  ) {
    const offeringBigInt = parseBigIntId(offeringId, 'offeringId');
    const enrollment = await client.course_enrollments.findUnique({
      where: {
        course_offerings_id_student_code: {
          course_offerings_id: offeringBigInt,
          student_code: studentCode,
        },
      },
      select: { student_code: true },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }
  }

  private async resolveCourseAndAuthorize(
    offeringId: string,
    actor: StaffActor,
    client: DbClient = this.prisma,
  ) {
    const offeringBigInt = parseBigIntId(offeringId, 'offeringId');
    const staffUserBigInt = parseBigIntId(actor.staffUserId, 'staffUserId');
    const offering = await client.course_offerings.findUnique({
      where: { course_offerings_id: offeringBigInt },
      select: { courses_id: true },
    });

    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    if (actor.role === 'ADMIN') return offering.courses_id;

    const link = await client.course_instructors.findFirst({
      where: {
        staff_users_id: staffUserBigInt,
        course_offerings: { courses_id: offering.courses_id },
      },
      select: { staff_users_id: true },
    });

    if (!link) {
      throw new ForbiddenException('You are not an instructor of this course');
    }

    return offering.courses_id;
  }

  private async loadExam(
    offeringId: string,
    examId: string,
    client: DbClient = this.prisma,
  ) {
    const examBigInt = parseBigIntId(examId, 'examId');
    const exam = await client.course_exams.findUnique({
      where: { course_exams_id: examBigInt },
      select: {
        course_exams_id: true,
        course_offerings_id: true,
        title: true,
        description: true,
        start_time: true,
        end_time: true,
        show_results_immediately: true,
        is_active: true,
        is_published: true,
        exam_questions: {
          orderBy: { sequence_index: 'asc' },
          select: {
            sequence_index: true,
            question_bank: {
              select: {
                question_id: true,
                is_active: true,
                question_text: true,
                question_type: true,
                difficulty_param: true,
                discrimination_param: true,
                guessing_param: true,
                question_knowledge: {
                  select: { knowledge_category_id: true },
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
              },
            },
          },
        },
      },
    });

    if (!exam || !exam.is_active) {
      throw new NotFoundException('Exam not found');
    }
    if (exam.course_offerings_id.toString() !== offeringId) {
      throw new ForbiddenException('Exam does not belong to this offering');
    }
    if (exam.exam_questions.length === 0) {
      throw new BadRequestException('Exam has no questions');
    }

    return exam;
  }

  private validateExamReadiness(
    exam: Awaited<ReturnType<ExamAttemptsService['loadExam']>>,
  ) {
    if (exam.exam_questions.length < MIN_ADAPTIVE_ITEM_BANK_SIZE) {
      throw new BadRequestException(
        `Adaptive IRT exams require at least ${MIN_ADAPTIVE_ITEM_BANK_SIZE} questions`,
      );
    }

    const inactive = exam.exam_questions.find(
      (item) => !item.question_bank.is_active,
    );
    if (inactive) {
      throw new BadRequestException('Exam contains inactive questions');
    }

    for (const item of exam.exam_questions) {
      const question = item.question_bank;
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
          'Every exam question must have valid IRT parameters',
        );
      }

      if (question.question_knowledge.length < 1) {
        throw new BadRequestException(
          'Every exam question must have at least one knowledge category',
        );
      }

      if (question.choices.length < 2) {
        throw new BadRequestException(
          'Every exam question must have at least two choices',
        );
      }

      const correctChoices = question.choices.filter(
        (choice) => choice.is_correct,
      );
      const expectedCorrectChoices =
        question.question_type === 'MCQ_MULTI'
          ? correctChoices.length >= 1
          : correctChoices.length === 1;
      if (!expectedCorrectChoices) {
        throw new BadRequestException(
          question.question_type === 'MCQ_MULTI'
            ? 'Every multi-select exam question must have at least one correct choice'
            : 'Every single-select exam question must have exactly one correct choice',
        );
      }
    }
  }

  private assertExamOpen(
    exam: Awaited<ReturnType<ExamAttemptsService['loadExam']>>,
  ) {
    const now = new Date();
    if (!exam.is_published) {
      throw new NotFoundException('Exam not found');
    }
    if (now < exam.start_time) {
      throw new BadRequestException('Exam has not started');
    }
    if (now > exam.end_time) {
      throw new BadRequestException('Exam has ended');
    }
  }

  private examQuestionCandidates(
    exam: Awaited<ReturnType<ExamAttemptsService['loadExam']>>,
  ): ExamQuestionCandidate[] {
    return exam.exam_questions
      .filter((item) => item.question_bank.is_active)
      .map((item) => ({
        question_id: item.question_bank.question_id,
        sequence_index: item.sequence_index,
        difficulty_param: item.question_bank.difficulty_param,
        discrimination_param: item.question_bank.discrimination_param,
        guessing_param: item.question_bank.guessing_param,
      }));
  }

  private async loadAttempt(
    examId: string,
    studentCode: string,
    client: DbClient = this.prisma,
  ) {
    const examBigInt = parseBigIntId(examId, 'examId');
    return client.exam_attempts.findUnique({
      where: {
        course_exams_id_student_code: {
          course_exams_id: examBigInt,
          student_code: studentCode,
        },
      },
      select: {
        exam_attempts_id: true,
        course_exams_id: true,
        student_code: true,
        status: true,
        started_at: true,
        submitted_at: true,
        total_score: true,
        passed: true,
        total_level: true,
        theta_estimate: true,
        standard_error: true,
        test_information: true,
        adaptive_stop_reason: true,
        adaptive_completed_at: true,
        time_per_exam: true,
        attempt_items: {
          orderBy: { sequence_index: 'asc' },
          select: {
            attempt_items_id: true,
            question_id: true,
            sequence_index: true,
            shown_at: true,
            answered_at: true,
            time_per_item: true,
            theta_at_selection: true,
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
                    display_order: true,
                  },
                },
              },
            },
            attempt_answers: {
              orderBy: { saved_at: 'desc' },
              select: {
                selected_choice_id: true,
                answer_text: true,
                is_correct: true,
                saved_at: true,
              },
            },
          },
        },
      },
    });
  }

  private canViewResult(
    exam: Awaited<ReturnType<ExamAttemptsService['loadExam']>>,
    attemptStatus: string,
  ) {
    return (
      attemptStatus === 'SUBMITTED' &&
      (exam.show_results_immediately || new Date() > exam.end_time)
    );
  }

  private buildAttemptState(
    exam: Awaited<ReturnType<ExamAttemptsService['loadExam']>>,
    attempt: NonNullable<
      Awaited<ReturnType<ExamAttemptsService['loadAttempt']>>
    >,
  ) {
    const totalQuestions = exam.exam_questions.length;
    const rules = adaptiveRules(totalQuestions);
    const answeredItems = attempt.attempt_items.filter(
      (item) => item.answered_at,
    );
    const currentItem =
      attempt.status === 'IN_PROGRESS'
        ? (attempt.attempt_items.find((item) => !item.answered_at) ?? null)
        : null;
    const adaptiveComplete =
      Boolean(attempt.adaptive_completed_at) ||
      (attempt.status === 'IN_PROGRESS' &&
        currentItem === null &&
        answeredItems.length >= rules.minItems);
    const progressTotalQuestions = adaptiveComplete
      ? answeredItems.length
      : rules.maxItems;
    const now = new Date();
    const remainingSeconds =
      attempt.status === 'IN_PROGRESS'
        ? Math.max(
            0,
            Math.floor((exam.end_time.getTime() - now.getTime()) / 1000),
          )
        : 0;
    const canViewResult = this.canViewResult(exam, attempt.status);
    const thetaEstimate = attempt.theta_estimate ?? attempt.total_level ?? 0;
    const selectedChoiceIds = (item: (typeof attempt.attempt_items)[number]) =>
      item.attempt_answers
        .map((answer) => answer.selected_choice_id?.toString())
        .filter((choiceId): choiceId is string => Boolean(choiceId));

    return serializeBigInt({
      attempt_id: attempt.exam_attempts_id,
      status: attempt.status,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
      total_score: canViewResult ? attempt.total_score : null,
      passed: canViewResult ? attempt.passed : null,
      total_level: thetaEstimate,
      theta_estimate: thetaEstimate,
      standard_error: attempt.standard_error,
      test_information: attempt.test_information,
      adaptive_stop_reason: attempt.adaptive_stop_reason,
      adaptive_completed_at: attempt.adaptive_completed_at,
      time_per_exam: attempt.time_per_exam,
      can_view_result: canViewResult,
      result_hidden:
        attempt.status === 'SUBMITTED' && !canViewResult
          ? 'Results will be available after the exam ends.'
          : null,
      exam: {
        course_exams_id: exam.course_exams_id,
        title: exam.title,
        description: exam.description,
        start_time: exam.start_time,
        end_time: exam.end_time,
        show_results_immediately: exam.show_results_immediately,
        question_count: totalQuestions,
      },
      progress: {
        answered_count: answeredItems.length,
        shown_count: attempt.attempt_items.length,
        total_questions: progressTotalQuestions,
        min_questions: rules.minItems,
        max_questions: rules.maxItems,
        remaining_seconds: remainingSeconds,
        adaptive_complete: adaptiveComplete,
        can_submit:
          attempt.status === 'IN_PROGRESS' &&
          currentItem === null &&
          answeredItems.length >= rules.minItems,
      },
      current_item: currentItem
        ? {
            attempt_items_id: currentItem.attempt_items_id,
            question_id: currentItem.question_id,
            sequence_index: currentItem.sequence_index,
            shown_at: currentItem.shown_at,
            answered_at: currentItem.answered_at,
            time_per_item: currentItem.time_per_item,
            theta_at_selection: currentItem.theta_at_selection,
            selected_choice_id:
              currentItem.attempt_answers[0]?.selected_choice_id ?? null,
            selected_choice_ids: selectedChoiceIds(currentItem),
            answer_text: currentItem.attempt_answers[0]?.answer_text ?? null,
            question: {
              question_id: currentItem.question_bank.question_id,
              question_text: currentItem.question_bank.question_text,
              question_type: currentItem.question_bank.question_type,
              choices: currentItem.question_bank.choices,
            },
          }
        : null,
      answered_items: answeredItems.map((item) => ({
        attempt_items_id: item.attempt_items_id,
        question_id: item.question_id,
        sequence_index: item.sequence_index,
        answered_at: item.answered_at,
        theta_at_selection: item.theta_at_selection,
        selected_choice_id: item.attempt_answers[0]?.selected_choice_id ?? null,
        selected_choice_ids: selectedChoiceIds(item),
      })),
    });
  }

  private async loadAnsweredIrtItems(
    tx: Prisma.TransactionClient,
    attemptId: bigint,
  ) {
    const items = await tx.attempt_items.findMany({
      where: {
        exam_attempts_id: attemptId,
        answered_at: { not: null },
      },
      orderBy: { sequence_index: 'asc' },
      select: {
        question_id: true,
        sequence_index: true,
        question_bank: {
          select: {
            difficulty_param: true,
            discrimination_param: true,
            guessing_param: true,
          },
        },
        attempt_answers: {
          orderBy: { saved_at: 'desc' },
          take: 1,
          select: { is_correct: true },
        },
      },
    });

    return items.map((item) => ({
      question_id: item.question_id,
      sequence_index: item.sequence_index,
      difficulty_param: item.question_bank.difficulty_param,
      discrimination_param: item.question_bank.discrimination_param,
      guessing_param: item.question_bank.guessing_param,
      is_correct: item.attempt_answers[0]?.is_correct === true,
    }));
  }

  private async getStandardErrorWorseningStreak(
    tx: Prisma.TransactionClient,
    attemptId: bigint,
    currentStandardError: number | null,
  ) {
    if (currentStandardError === null) return 0;

    const rows = await tx.exam_theta_tracking.findMany({
      where: {
        exam_attempts_id: attemptId,
        standard_error: { not: null },
      },
      orderBy: { sequence_index: 'desc' },
      take: 3,
      select: { standard_error: true },
    });

    let streak = 0;
    let cursor = currentStandardError;
    for (const row of rows) {
      if (row.standard_error !== null && cursor > row.standard_error) {
        streak++;
        cursor = row.standard_error;
      } else {
        break;
      }
    }

    return streak;
  }

  private async createNextAttemptItem(
    tx: Prisma.TransactionClient,
    exam: Awaited<ReturnType<ExamAttemptsService['loadExam']>>,
    attemptId: bigint,
    theta: number,
  ) {
    const shownItems = await tx.attempt_items.findMany({
      where: { exam_attempts_id: attemptId },
      orderBy: { sequence_index: 'asc' },
      select: { question_id: true },
    });
    const shownQuestionIds = new Set(
      shownItems.map((item) => item.question_id.toString()),
    );
    const nextQuestion = pickNextQuestion(
      this.examQuestionCandidates(exam),
      shownQuestionIds,
      theta,
    );
    if (!nextQuestion) return false;

    const created = await tx.attempt_items.create({
      data: {
        exam_attempts_id: attemptId,
        question_id: nextQuestion.question_id,
        sequence_index: shownItems.length,
        theta_at_selection: theta,
      },
      select: { attempt_items_id: true },
    });
    await tx.exam_behavior_logs.create({
      data: {
        exam_attempts_id: attemptId,
        attempt_items_id: created.attempt_items_id,
        question_id: nextQuestion.question_id,
        event_type: 'adaptive_question_selected',
        metadata: {
          theta,
          item_information: itemInformation(theta, nextQuestion),
          difficulty_param: nextQuestion.difficulty_param,
          discrimination_param: nextQuestion.discrimination_param,
          guessing_param: nextQuestion.guessing_param,
          sequence_index: shownItems.length,
          shown_question_count: shownItems.length,
        } as Prisma.InputJsonValue,
      },
    });

    return true;
  }

  private async finalizeAttempt(
    attemptId: bigint,
    exam: Awaited<ReturnType<ExamAttemptsService['loadExam']>>,
    submittedAt = new Date(),
  ) {
    await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.exam_attempts.findUnique({
        where: { exam_attempts_id: attemptId },
        select: {
          exam_attempts_id: true,
          status: true,
          started_at: true,
          total_level: true,
          theta_estimate: true,
          adaptive_stop_reason: true,
          adaptive_completed_at: true,
        },
      });
      if (!attempt || attempt.status !== 'IN_PROGRESS') return;

      const items = await tx.attempt_items.findMany({
        where: { exam_attempts_id: attemptId },
        select: {
          attempt_answers: {
            orderBy: { saved_at: 'desc' },
            take: 1,
            select: { is_correct: true },
          },
        },
      });
      const correctCount = items.filter(
        (item) => item.attempt_answers[0]?.is_correct === true,
      ).length;
      const rawScore = computePercentScore(correctCount, items.length);
      const elapsedSeconds = Math.max(
        0,
        Math.floor(
          (submittedAt.getTime() - attempt.started_at.getTime()) / 1000,
        ),
      );

      await tx.exam_attempts.update({
        where: { exam_attempts_id: attemptId },
        data: {
          status: 'SUBMITTED',
          submitted_at: submittedAt,
          total_score: rawScore.toFixed(2),
          passed: didPass(rawScore),
          adaptive_completed_at: attempt.adaptive_completed_at ?? new Date(),
          adaptive_stop_reason: attempt.adaptive_stop_reason ?? 'submitted',
          time_per_exam: elapsedSeconds,
          updated_at: new Date(),
        },
      });
    });
  }

  async start(offeringId: string, examId: string, user: JwtPayload) {
    const student = this.assertStudent(user);
    const exam = await this.loadExam(offeringId, examId);
    await this.verifyStudentEnrollment(offeringId, student.sub);
    if (!exam.is_published) {
      throw new NotFoundException('Exam not found');
    }

    const existing = await this.loadAttempt(examId, student.sub);
    if (existing) {
      if (existing.status === 'IN_PROGRESS' && new Date() < exam.start_time) {
        throw new BadRequestException('Exam has not started');
      }
      if (existing.status === 'IN_PROGRESS' && new Date() > exam.end_time) {
        await this.finalizeAttempt(
          existing.exam_attempts_id,
          exam,
          exam.end_time,
        );
        return this.getAttempt(offeringId, examId, user);
      }
      if (existing.status === 'IN_PROGRESS') {
        this.validateExamReadiness(exam);
      }
      return this.buildAttemptState(exam, existing);
    }

    this.assertExamOpen(exam);
    this.validateExamReadiness(exam);

    const firstQuestion = pickNextQuestion(
      this.examQuestionCandidates(exam),
      new Set(),
      0,
    );
    if (!firstQuestion) {
      throw new BadRequestException('Exam has no questions');
    }

    await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.exam_attempts.create({
        data: {
          course_exams_id: parseBigIntId(examId, 'examId'),
          student_code: student.sub,
          total_level: 0,
          theta_estimate: 0,
        },
        select: { exam_attempts_id: true },
      });

      const firstItem = await tx.attempt_items.create({
        data: {
          exam_attempts_id: attempt.exam_attempts_id,
          question_id: firstQuestion.question_id,
          sequence_index: 0,
          theta_at_selection: 0,
        },
        select: { attempt_items_id: true },
      });
      await tx.exam_behavior_logs.create({
        data: {
          exam_attempts_id: attempt.exam_attempts_id,
          attempt_items_id: firstItem.attempt_items_id,
          question_id: firstQuestion.question_id,
          event_type: 'adaptive_question_selected',
          metadata: {
            theta: 0,
            item_information: itemInformation(0, firstQuestion),
            difficulty_param: firstQuestion.difficulty_param,
            discrimination_param: firstQuestion.discrimination_param,
            guessing_param: firstQuestion.guessing_param,
            sequence_index: 0,
            shown_question_count: 0,
          } as Prisma.InputJsonValue,
        },
      });
    });

    return this.getAttempt(offeringId, examId, user);
  }

  async getAttempt(offeringId: string, examId: string, user: JwtPayload) {
    const student = this.assertStudent(user);
    const exam = await this.loadExam(offeringId, examId);
    await this.verifyStudentEnrollment(offeringId, student.sub);
    if (!exam.is_published) {
      throw new NotFoundException('Exam not found');
    }

    const attempt = await this.loadAttempt(examId, student.sub);
    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }
    if (attempt.status === 'IN_PROGRESS' && new Date() < exam.start_time) {
      throw new BadRequestException('Exam has not started');
    }

    if (attempt.status === 'IN_PROGRESS' && new Date() > exam.end_time) {
      await this.finalizeAttempt(attempt.exam_attempts_id, exam, exam.end_time);
      const finalized = await this.loadAttempt(examId, student.sub);
      if (!finalized) throw new NotFoundException('Attempt not found');
      return this.buildAttemptState(exam, finalized);
    }
    if (attempt.status === 'IN_PROGRESS') {
      this.validateExamReadiness(exam);
    }

    return this.buildAttemptState(exam, attempt);
  }

  async saveAnswer(
    offeringId: string,
    examId: string,
    attemptItemId: string,
    dto: SaveAnswerDto,
    user: JwtPayload,
  ) {
    const student = this.assertStudent(user);
    const exam = await this.loadExam(offeringId, examId);
    await this.verifyStudentEnrollment(offeringId, student.sub);
    if (!exam.is_published) {
      throw new NotFoundException('Exam not found');
    }

    const attempt = await this.loadAttempt(examId, student.sub);
    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }
    if (attempt.status === 'CANCELLED') {
      throw new BadRequestException('Attempt has been cancelled');
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Attempt has already been submitted');
    }
    if (new Date() < exam.start_time) {
      throw new BadRequestException('Exam has not started');
    }
    if (new Date() > exam.end_time) {
      await this.finalizeAttempt(attempt.exam_attempts_id, exam, exam.end_time);
      return this.getAttempt(offeringId, examId, user);
    }
    this.validateExamReadiness(exam);
    if (!dto.selected_choice_id && !dto.answer_text?.trim()) {
      const hasSelectedChoices = (dto.selected_choice_ids?.length ?? 0) > 0;
      if (!hasSelectedChoices) {
        throw new BadRequestException('Answer is required');
      }
    }
    if (
      dto.selected_choice_id &&
      dto.selected_choice_ids &&
      dto.selected_choice_ids.length > 0
    ) {
      throw new BadRequestException(
        'Use either selected_choice_id or selected_choice_ids',
      );
    }
    const attemptItemBigInt = parseBigIntId(attemptItemId, 'attemptItemId');
    const requestedChoiceIds = dto.selected_choice_ids?.length
      ? dto.selected_choice_ids.map((choiceId) =>
          parseBigIntId(choiceId, 'selected_choice_ids'),
        )
      : dto.selected_choice_id
        ? [parseBigIntId(dto.selected_choice_id, 'selected_choice_id')]
        : [];

    await this.prisma.$transaction(async (tx) => {
      const item = await tx.attempt_items.findUnique({
        where: { attempt_items_id: attemptItemBigInt },
        select: {
          attempt_items_id: true,
          exam_attempts_id: true,
          question_id: true,
          sequence_index: true,
          shown_at: true,
          answered_at: true,
          choice_selection_log: true,
          question_bank: {
            select: {
              question_type: true,
              difficulty_param: true,
              discrimination_param: true,
              guessing_param: true,
              choices: {
                select: {
                  choice_id: true,
                  is_correct: true,
                },
              },
            },
          },
          attempt_answers: {
            orderBy: { saved_at: 'desc' },
            take: 1,
            select: { is_correct: true },
          },
        },
      });

      if (!item || item.exam_attempts_id !== attempt.exam_attempts_id) {
        throw new NotFoundException('Attempt item not found');
      }
      if (item.answered_at) {
        throw new BadRequestException(
          'This question has already been answered',
        );
      }

      const uniqueChoiceIds = new Set(
        requestedChoiceIds.map((choiceId) => choiceId.toString()),
      );
      if (uniqueChoiceIds.size !== requestedChoiceIds.length) {
        throw new BadRequestException('Duplicate choices are not allowed');
      }

      if (
        item.question_bank.question_type === 'MCQ_SINGLE' &&
        requestedChoiceIds.length !== 1
      ) {
        throw new BadRequestException(
          'Single-select questions require one choice',
        );
      }
      if (
        item.question_bank.question_type === 'MCQ_MULTI' &&
        requestedChoiceIds.length < 1
      ) {
        throw new BadRequestException(
          'Multi-select questions require at least one choice',
        );
      }

      const selectedChoices = requestedChoiceIds.map((selectedChoiceId) => {
        const selectedChoice = item.question_bank.choices.find(
          (choice) => choice.choice_id === selectedChoiceId,
        );
        if (!selectedChoice) {
          throw new BadRequestException(
            'Choice does not belong to this question',
          );
        }
        return selectedChoice;
      });

      const selectedChoiceIds = selectedChoices.map((choice) =>
        choice.choice_id.toString(),
      );
      const isCorrect =
        selectedChoices.length > 0
          ? isExactChoiceSelectionCorrect(
              item.question_bank.choices
                .filter((choice) => choice.is_correct)
                .map((choice) => choice.choice_id.toString()),
              selectedChoiceIds,
            )
          : false;
      const currentTheta = attempt.theta_estimate ?? attempt.total_level ?? 0;
      const savedAt = new Date();
      const existingLog = Array.isArray(item.choice_selection_log)
        ? item.choice_selection_log
        : [];
      const nextLog = [
        ...existingLog.slice(-49),
        {
          selected_choice_id: selectedChoiceIds[0] ?? null,
          selected_choice_ids: selectedChoiceIds,
          answer_text: dto.answer_text?.trim() || null,
          is_correct: isCorrect,
          saved_at: savedAt.toISOString(),
        },
      ];

      await tx.attempt_answers.deleteMany({
        where: { attempt_items_id: item.attempt_items_id },
      });
      if (selectedChoices.length > 0) {
        await tx.attempt_answers.createMany({
          data: selectedChoices.map((choice) => ({
            attempt_items_id: item.attempt_items_id,
            selected_choice_id: choice.choice_id,
            answer_text: dto.answer_text?.trim() || null,
            is_correct: isCorrect,
            saved_at: savedAt,
          })),
        });
      } else {
        await tx.attempt_answers.create({
          data: {
            attempt_items_id: item.attempt_items_id,
            answer_text: dto.answer_text?.trim() || null,
            is_correct: false,
            saved_at: savedAt,
          },
        });
      }
      await tx.attempt_items.update({
        where: { attempt_items_id: item.attempt_items_id },
        data: {
          answered_at: savedAt,
          time_per_item: Math.max(
            0,
            Math.floor((savedAt.getTime() - item.shown_at.getTime()) / 1000),
          ),
          choice_selection_log: nextLog,
        },
      });

      const answeredIrtItems = await this.loadAnsweredIrtItems(
        tx,
        attempt.exam_attempts_id,
      );
      const thetaUpdate = updateTheta(currentTheta, answeredIrtItems);
      const thetaChange = Math.abs(thetaUpdate.theta - currentTheta);
      const worseningStreak = await this.getStandardErrorWorseningStreak(
        tx,
        attempt.exam_attempts_id,
        thetaUpdate.standardError,
      );
      const stopResult = evaluateStopRule({
        answeredCount: answeredIrtItems.length,
        totalItems: this.examQuestionCandidates(exam).length,
        theta: thetaUpdate.theta,
        standardError: thetaUpdate.standardError,
        thetaChange,
        worseningStreak,
      });
      let stopReason = stopResult.reason;
      const currentQuestion = {
        question_id: item.question_id,
        sequence_index: item.sequence_index,
        difficulty_param: item.question_bank.difficulty_param,
        discrimination_param: item.question_bank.discrimination_param,
        guessing_param: item.question_bank.guessing_param,
      };

      await tx.exam_attempts.update({
        where: { exam_attempts_id: attempt.exam_attempts_id },
        data: {
          total_level: thetaUpdate.theta,
          theta_estimate: thetaUpdate.theta,
          standard_error: thetaUpdate.standardError,
          test_information: thetaUpdate.testInformation,
          ...(stopResult.shouldStop
            ? {
                adaptive_completed_at: savedAt,
                adaptive_stop_reason: stopResult.reason,
              }
            : {}),
          updated_at: savedAt,
        },
      });

      if (!stopResult.shouldStop) {
        const createdNext = await this.createNextAttemptItem(
          tx,
          exam,
          attempt.exam_attempts_id,
          thetaUpdate.theta,
        );
        if (!createdNext) {
          stopReason = 'item_bank_exhausted';
          await tx.exam_attempts.update({
            where: { exam_attempts_id: attempt.exam_attempts_id },
            data: {
              adaptive_completed_at: savedAt,
              adaptive_stop_reason: stopReason,
              updated_at: savedAt,
            },
          });
        }
      }

      await tx.exam_theta_tracking.create({
        data: {
          exam_attempts_id: attempt.exam_attempts_id,
          attempt_items_id: item.attempt_items_id,
          question_id: item.question_id,
          sequence_index: item.sequence_index,
          theta_before: thetaUpdate.previousTheta,
          theta_after: thetaUpdate.theta,
          standard_error: thetaUpdate.standardError,
          test_information: thetaUpdate.testInformation,
          item_information: itemInformation(thetaUpdate.theta, currentQuestion),
          score_function: thetaUpdate.score,
          response_correct: isCorrect,
          stop_reason: stopReason,
        },
      });
    });

    return this.getAttempt(offeringId, examId, user);
  }

  async submit(offeringId: string, examId: string, user: JwtPayload) {
    const student = this.assertStudent(user);
    const exam = await this.loadExam(offeringId, examId);
    await this.verifyStudentEnrollment(offeringId, student.sub);
    if (!exam.is_published) {
      throw new NotFoundException('Exam not found');
    }

    const attempt = await this.loadAttempt(examId, student.sub);
    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }
    if (attempt.status === 'CANCELLED') {
      throw new BadRequestException('Attempt has been cancelled');
    }
    if (attempt.status === 'IN_PROGRESS') {
      const now = new Date();
      if (now < exam.start_time) {
        throw new BadRequestException('Exam has not started');
      }
      if (now <= exam.end_time) {
        this.validateExamReadiness(exam);
        const rules = adaptiveRules(exam.exam_questions.length);
        const answeredItems = attempt.attempt_items.filter(
          (item) => item.answered_at,
        );
        const currentItem =
          attempt.attempt_items.find((item) => !item.answered_at) ?? null;
        if (currentItem || answeredItems.length < rules.minItems) {
          throw new BadRequestException('Adaptive exam is not complete yet');
        }
      }
      await this.finalizeAttempt(
        attempt.exam_attempts_id,
        exam,
        now > exam.end_time ? exam.end_time : now,
      );
    }

    return this.getAttempt(offeringId, examId, user);
  }

  async recordEvent(
    offeringId: string,
    examId: string,
    dto: BehaviorEventDto,
    user: JwtPayload,
  ) {
    const student = this.assertStudent(user);
    await this.verifyStudentEnrollment(offeringId, student.sub);
    const examBigInt = parseBigIntId(examId, 'examId');

    const attempt = await this.prisma.exam_attempts.findUnique({
      where: {
        course_exams_id_student_code: {
          course_exams_id: examBigInt,
          student_code: student.sub,
        },
      },
      select: {
        exam_attempts_id: true,
        course_exams: {
          select: {
            course_offerings_id: true,
            is_active: true,
          },
        },
      },
    });

    if (
      !attempt ||
      !attempt.course_exams.is_active ||
      attempt.course_exams.course_offerings_id.toString() !== offeringId
    ) {
      throw new NotFoundException('Attempt not found');
    }
    const eventType = dto.event_type.trim();
    if (!eventType) {
      throw new BadRequestException('event_type is required');
    }

    const attemptItemId = dto.attempt_items_id
      ? parseBigIntId(dto.attempt_items_id, 'attempt_items_id')
      : null;
    const questionId = dto.question_id
      ? parseBigIntId(dto.question_id, 'question_id')
      : null;

    if (attemptItemId) {
      const item = await this.prisma.attempt_items.findUnique({
        where: { attempt_items_id: attemptItemId },
        select: { exam_attempts_id: true, question_id: true },
      });
      if (!item || item.exam_attempts_id !== attempt.exam_attempts_id) {
        throw new BadRequestException(
          'Attempt item does not belong to attempt',
        );
      }
      if (questionId && item.question_id !== questionId) {
        throw new BadRequestException(
          'question_id does not match attempt item',
        );
      }
    } else if (questionId) {
      const item = await this.prisma.attempt_items.findFirst({
        where: {
          exam_attempts_id: attempt.exam_attempts_id,
          question_id: questionId,
        },
        select: { attempt_items_id: true },
      });
      if (!item) {
        throw new BadRequestException('Question does not belong to attempt');
      }
    }

    await this.prisma.exam_behavior_logs.create({
      data: {
        exam_attempts_id: attempt.exam_attempts_id,
        attempt_items_id: attemptItemId,
        question_id: questionId,
        event_type: eventType,
        metadata:
          dto.metadata === undefined
            ? Prisma.JsonNull
            : (dto.metadata as Prisma.InputJsonValue),
      },
    });

    return { success: true };
  }

  async getSummary(offeringId: string, examId: string, actor: StaffActor) {
    await this.resolveCourseAndAuthorize(offeringId, actor);
    const exam = await this.loadExam(offeringId, examId);
    const offeringBigInt = parseBigIntId(offeringId, 'offeringId');
    const examBigInt = parseBigIntId(examId, 'examId');

    const [totalEnrolled, attempts] = await Promise.all([
      this.prisma.course_enrollments.count({
        where: { course_offerings_id: offeringBigInt },
      }),
      this.fetchAttempts(examBigInt),
    ]);

    return serializeBigInt(
      this.buildSummaryResponse(exam, totalEnrolled, attempts),
    );
  }

  async getSummariesForOffering(
    offeringId: string,
    examIds: string[],
    actor: StaffActor,
  ) {
    await this.resolveCourseAndAuthorize(offeringId, actor);
    const offeringBigInt = parseBigIntId(offeringId, 'offeringId');

    const totalEnrolled = await this.prisma.course_enrollments.count({
      where: { course_offerings_id: offeringBigInt },
    });

    const summaries = await Promise.all(
      examIds.map(async (examId) => {
        const exam = await this.loadExam(offeringId, examId);
        const examBigInt = parseBigIntId(examId, 'examId');
        const attempts = await this.fetchAttempts(examBigInt);
        return this.buildSummaryResponse(exam, totalEnrolled, attempts);
      }),
    );

    return serializeBigInt(summaries);
  }

  private async fetchAttempts(examBigInt: bigint) {
    return this.prisma.exam_attempts.findMany({
      where: { course_exams_id: examBigInt },
      orderBy: { started_at: 'asc' },
      select: {
        exam_attempts_id: true,
        student_code: true,
        status: true,
        started_at: true,
        submitted_at: true,
        total_score: true,
        passed: true,
        theta_estimate: true,
        standard_error: true,
        test_information: true,
        adaptive_stop_reason: true,
        time_per_exam: true,
        students: {
          select: {
            title: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        _count: {
          select: {
            attempt_items: true,
            exam_behavior_logs: true,
          },
        },
        exam_behavior_logs: {
          orderBy: { occurred_at: 'desc' },
          take: 1,
          select: {
            event_type: true,
            occurred_at: true,
          },
        },
      },
    });
  }

  private buildSummaryResponse(
    exam: Awaited<ReturnType<typeof this.loadExam>>,
    totalEnrolled: number,
    attempts: Awaited<ReturnType<typeof this.fetchAttempts>>,
  ) {
    const submitted = attempts.filter(
      (attempt) => attempt.status === 'SUBMITTED',
    );
    const scores = submitted
      .map((attempt) =>
        attempt.total_score == null ? null : Number(attempt.total_score),
      )
      .filter((score): score is number => typeof score === 'number');
    const averageScore =
      scores.length > 0
        ? Number(
            (
              scores.reduce((sum, score) => sum + score, 0) / scores.length
            ).toFixed(2),
          )
        : null;

    return {
      exam: {
        course_exams_id: exam.course_exams_id,
        title: exam.title,
        description: exam.description,
        start_time: exam.start_time,
        end_time: exam.end_time,
        show_results_immediately: exam.show_results_immediately,
        question_count: exam.exam_questions.length,
      },
      summary: {
        total_enrolled: totalEnrolled,
        attempts_started: attempts.length,
        submitted: submitted.length,
        in_progress: attempts.filter(
          (attempt) => attempt.status === 'IN_PROGRESS',
        ).length,
        average_score: averageScore,
        behavior_events: attempts.reduce(
          (sum, attempt) => sum + attempt._count.exam_behavior_logs,
          0,
        ),
      },
      attempts: attempts.map((attempt) => ({
        attempt_id: attempt.exam_attempts_id,
        student_code: attempt.student_code,
        student_name:
          `${attempt.students.title ?? ''}${attempt.students.first_name} ${attempt.students.last_name}`.trim(),
        email: attempt.students.email,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        total_score: attempt.total_score,
        passed: attempt.passed,
        theta_estimate: attempt.theta_estimate,
        standard_error: attempt.standard_error,
        test_information: attempt.test_information,
        adaptive_stop_reason: attempt.adaptive_stop_reason,
        time_per_exam: attempt.time_per_exam,
        answered_count: attempt._count.attempt_items,
        behavior_event_count: attempt._count.exam_behavior_logs,
        last_behavior_event: attempt.exam_behavior_logs[0] ?? null,
      })),
    };
  }
}
