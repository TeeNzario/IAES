import { exam_attempt_status } from '../../src/generated/prisma/client';
import {
  AnsweredQuestionCandidate,
  ExamQuestionCandidate,
  pickNextQuestion,
  updateTheta,
} from '../../src/modules/exam-attempts/adaptive/adaptive-selector';
import { prisma } from '../../src/lib/prisma';
import { SeededExam } from './exams';

type AttemptMode =
  | { status: 'SUBMITTED'; correctness: 'all' | 'most' | 'mixed' | 'few' }
  | { status: 'IN_PROGRESS' }
  | { status: 'CANCELLED' };

type AttemptPlan = {
  examTitle: string;
  student_code: string;
  mode: AttemptMode;
  seed: number; // deterministic seed for choice selection log
};

const PLANS: AttemptPlan[] = [
  // --- กลางภาค Machine Learning — mixed outcomes
  {
    examTitle: 'กลางภาค Machine Learning',
    student_code: '66131319',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 1,
  },
  {
    examTitle: 'กลางภาค Machine Learning',
    student_code: '66250102',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 2,
  },
  {
    examTitle: 'กลางภาค Machine Learning',
    student_code: '66250103',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 3,
  },
  {
    examTitle: 'กลางภาค Machine Learning',
    student_code: '66250104',
    mode: { status: 'SUBMITTED', correctness: 'few' },
    seed: 4,
  },
  {
    examTitle: 'กลางภาค Machine Learning',
    student_code: '66220501',
    mode: { status: 'CANCELLED' },
    seed: 5,
  },

  // --- ปลายภาค Machine Learning
  {
    examTitle: 'ปลายภาค Machine Learning',
    student_code: '66131319',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 6,
  },
  {
    examTitle: 'ปลายภาค Machine Learning',
    student_code: '66250102',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 7,
  },
  {
    examTitle: 'ปลายภาค Machine Learning',
    student_code: '66250103',
    mode: { status: 'IN_PROGRESS' },
    seed: 8,
  },

  // --- Front End Quiz
  {
    examTitle: 'แบบทดสอบย่อย 1 — HTML/CSS/JS',
    student_code: '66131319',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 9,
  },
  {
    examTitle: 'แบบทดสอบย่อย 1 — HTML/CSS/JS',
    student_code: '66220501',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 10,
  },
  {
    examTitle: 'แบบทดสอบย่อย 1 — HTML/CSS/JS',
    student_code: '66220502',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 11,
  },
  {
    examTitle: 'แบบทดสอบย่อย 1 — HTML/CSS/JS',
    student_code: '65220101',
    mode: { status: 'SUBMITTED', correctness: 'few' },
    seed: 12,
  },

  // --- Front End Midterm
  {
    examTitle: 'กลางภาค Front End',
    student_code: '66131319',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 13,
  },
  {
    examTitle: 'กลางภาค Front End',
    student_code: '66220501',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 14,
  },
  {
    examTitle: 'กลางภาค Front End',
    student_code: '65220101',
    mode: { status: 'IN_PROGRESS' },
    seed: 15,
  },

  // --- Network midterm
  {
    examTitle: 'กลางภาค Network',
    student_code: '66250102',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 16,
  },
  {
    examTitle: 'กลางภาค Network',
    student_code: '66250103',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 17,
  },
  {
    examTitle: 'กลางภาค Network',
    student_code: '65250101',
    mode: { status: 'SUBMITTED', correctness: 'few' },
    seed: 18,
  },

  // --- Data Warehouse
  {
    examTitle: 'กลางภาค Data Warehouse',
    student_code: '66250102',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 19,
  },
  {
    examTitle: 'กลางภาค Data Warehouse',
    student_code: '66220501',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 20,
  },

  // --- Standard IT
  {
    examTitle: 'แบบทดสอบมาตรฐาน IT',
    student_code: '66131319',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 21,
  },
  {
    examTitle: 'แบบทดสอบมาตรฐาน IT',
    student_code: '66220501',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 22,
  },
  {
    examTitle: 'แบบทดสอบมาตรฐาน IT',
    student_code: '66131320',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 23,
  },
  {
    examTitle: 'แบบทดสอบมาตรฐาน IT',
    student_code: '66131321',
    mode: { status: 'IN_PROGRESS' },
    seed: 24,
  },

  // --- Standard English
  {
    examTitle: 'แบบทดสอบมาตรฐาน English',
    student_code: '63131101',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 25,
  },
  {
    examTitle: 'แบบทดสอบมาตรฐาน English',
    student_code: '63131102',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 26,
  },
  {
    examTitle: 'แบบทดสอบมาตรฐาน English',
    student_code: '66131319',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 27,
  },

  // --- Mobile Development (COE64-233)
  {
    examTitle: 'ปลายภาค Mobile Development',
    student_code: '65220101',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 28,
  },
  {
    examTitle: 'ปลายภาค Mobile Development',
    student_code: '66220501',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 29,
  },
  {
    examTitle: 'ปลายภาค Mobile Development',
    student_code: '66131319',
    mode: { status: 'IN_PROGRESS' },
    seed: 30,
  },

  // --- Signals and Systems (COE64-305)
  {
    examTitle: 'กลางภาค Signals and Systems',
    student_code: '64121201',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 31,
  },
  {
    examTitle: 'กลางภาค Signals and Systems',
    student_code: '64121202',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 32,
  },
  {
    examTitle: 'กลางภาค Signals and Systems',
    student_code: '66121212',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 33,
  },
  {
    examTitle: 'กลางภาค Signals and Systems',
    student_code: '65250101',
    mode: { status: 'SUBMITTED', correctness: 'few' },
    seed: 34,
  },

  // --- Sociology (GED65-130)
  {
    examTitle: 'กลางภาค สังคมวิทยาเบื้องต้น',
    student_code: '66170201',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 35,
  },
  {
    examTitle: 'กลางภาค สังคมวิทยาเบื้องต้น',
    student_code: '66112233',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 36,
  },
  {
    examTitle: 'กลางภาค สังคมวิทยาเบื้องต้น',
    student_code: '63131101',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 37,
  },
  {
    examTitle: 'กลางภาค สังคมวิทยาเบื้องต้น',
    student_code: '66140101',
    mode: { status: 'IN_PROGRESS' },
    seed: 38,
  },
  {
    examTitle: 'กลางภาค สังคมวิทยาเบื้องต้น',
    student_code: '66110701',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 45,
  },

  // --- Standard Thai (STD-003)
  {
    examTitle: 'แบบทดสอบมาตรฐาน ภาษาไทย',
    student_code: '63131102',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 39,
  },
  {
    examTitle: 'แบบทดสอบมาตรฐาน ภาษาไทย',
    student_code: '66110701',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 40,
  },
  {
    examTitle: 'แบบทดสอบมาตรฐาน ภาษาไทย',
    student_code: '66131319',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 41,
  },

  // --- CNN (COE64-361)
  {
    examTitle: 'กลางภาค Convolutional Neural Networks',
    student_code: '66250102',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 42,
  },
  {
    examTitle: 'กลางภาค Convolutional Neural Networks',
    student_code: '66250103',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 43,
  },
  {
    examTitle: 'กลางภาค Convolutional Neural Networks',
    student_code: '66250104',
    mode: { status: 'IN_PROGRESS' },
    seed: 44,
  },
  // --- Food Processing midterm
  {
    examTitle: 'กลางภาค Food Processing',
    student_code: '66180101',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 46,
  },
  // --- Business Law midterm
  {
    examTitle: 'กลางภาค กฎหมายธุรกิจ',
    student_code: '66140101',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 47,
  },
  {
    examTitle: 'กลางภาค กฎหมายธุรกิจ',
    student_code: '66150101',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 48,
  },
  {
    examTitle: 'กลางภาค กฎหมายธุรกิจ',
    student_code: '65150101',
    mode: { status: 'CANCELLED' },
    seed: 49,
  },
  // --- Basic Anatomy midterm
  {
    examTitle: 'กลางภาค Basic Anatomy',
    student_code: '66190101',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 50,
  },
  {
    examTitle: 'กลางภาค Basic Anatomy',
    student_code: '66170201',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 51,
  },
  // --- Educational Psychology midterm
  {
    examTitle: 'กลางภาค Educational Psychology',
    student_code: '66230101',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 52,
  },
  {
    examTitle: 'กลางภาค Educational Psychology',
    student_code: '66110701',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 53,
  },
  // --- Front End 2025 Final
  {
    examTitle: 'ปลายภาค Front End Programming',
    student_code: '65220101',
    mode: { status: 'SUBMITTED', correctness: 'most' },
    seed: 54,
  },
  {
    examTitle: 'ปลายภาค Front End Programming',
    student_code: '66131319',
    mode: { status: 'SUBMITTED', correctness: 'all' },
    seed: 55,
  },
  {
    examTitle: 'ปลายภาค Front End Programming',
    student_code: '66220501',
    mode: { status: 'SUBMITTED', correctness: 'mixed' },
    seed: 56,
  },
  // --- More varied attempts for existing exams ---
  // Standard IT — CANCELLED
  {
    examTitle: 'แบบทดสอบมาตรฐาน IT',
    student_code: '66220502',
    mode: { status: 'CANCELLED' },
    seed: 57,
  },
  // Standard English — IN_PROGRESS
  {
    examTitle: 'แบบทดสอบมาตรฐาน English',
    student_code: '66220501',
    mode: { status: 'IN_PROGRESS' },
    seed: 58,
  },
  // Sociology — CANCELLED
  {
    examTitle: 'กลางภาค สังคมวิทยาเบื้องต้น',
    student_code: '63131102',
    mode: { status: 'CANCELLED' },
    seed: 59,
  },
];

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickCorrectness(
  mode: 'all' | 'most' | 'mixed' | 'few',
  rand: () => number,
): boolean {
  const threshold =
    mode === 'all'
      ? 1.0
      : mode === 'most'
        ? 0.8
        : mode === 'mixed'
          ? 0.5
          : 0.25;
  return rand() < threshold;
}

export async function seedAttempts(exams: SeededExam[]): Promise<void> {
  const examByTitle = new Map(exams.map((e) => [e.exam.title, e]));

  let created = 0;
  let skipped = 0;

  for (const plan of PLANS) {
    const exam = examByTitle.get(plan.examTitle);
    if (!exam || exam.questions.length === 0) {
      skipped++;
      continue;
    }

    const existing = await prisma.exam_attempts.findUnique({
      where: {
        course_exams_id_student_code: {
          course_exams_id: exam.exam.course_exams_id,
          student_code: plan.student_code,
        },
      },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const rand = mulberry32(plan.seed);
    const totalQuestions = exam.questions.length;
    const startedAt = new Date(
      exam.exam.start_time.getTime() + Math.floor(rand() * 60 * 60 * 1000),
    );

    const isSubmitted = plan.mode.status === 'SUBMITTED';
    const isCancelled = plan.mode.status === 'CANCELLED';
    const isInProgress = plan.mode.status === 'IN_PROGRESS';

    const submittedAt = isSubmitted
      ? new Date(startedAt.getTime() + (30 + Math.floor(rand() * 60)) * 60_000)
      : null;
    const timePerExam = isSubmitted
      ? Math.floor((submittedAt!.getTime() - startedAt.getTime()) / 1000)
      : isCancelled
        ? 600 + Math.floor(rand() * 900)
        : null;

    const plannedItemCount = isSubmitted
      ? totalQuestions
      : isInProgress
        ? Math.max(1, Math.floor(totalQuestions * (0.3 + rand() * 0.4)))
        : Math.max(1, Math.floor(totalQuestions * 0.2));

    const questionCandidates: ExamQuestionCandidate[] = exam.questions.map(
      (question, index) => ({
        question_id: question.question_id,
        sequence_index: index,
        difficulty_param: question.difficulty_param,
        discrimination_param: question.discrimination_param,
        guessing_param: question.guessing_param,
      }),
    );
    const shownQuestionIds = new Set<string>();
    let administeredCount = 0;
    let correctCount = 0;
    const answeredIrtItems: AnsweredQuestionCandidate[] = [];
    let thetaEstimate = 0;
    let standardError: number | null = null;
    let testInformation: number | null = null;

    const attempt = await prisma.exam_attempts.create({
      data: {
        course_exams_id: exam.exam.course_exams_id,
        student_code: plan.student_code,
        status: plan.mode.status as exam_attempt_status,
        started_at: startedAt,
        submitted_at: submittedAt,
        total_level: 0,
        theta_estimate: 0,
        time_per_exam: timePerExam,
      },
    });

    for (let i = 0; i < plannedItemCount; i++) {
      const nextQuestion = pickNextQuestion(
        questionCandidates,
        shownQuestionIds,
        thetaEstimate,
      );
      if (!nextQuestion) break;
      shownQuestionIds.add(nextQuestion.question_id.toString());

      const question = exam.questions.find(
        (q) => q.question_id === nextQuestion.question_id,
      );
      if (!question) continue;

      const choices = await prisma.question_choices.findMany({
        where: { question_id: question.question_id },
        orderBy: { display_order: 'asc' },
      });
      if (choices.length === 0) continue;

      const correctChoices = choices.filter((c) => c.is_correct);
      const wrongChoices = choices.filter((c) => !c.is_correct);
      if (correctChoices.length === 0) continue;
      administeredCount++;

      const shouldBeCorrect =
        isSubmitted && 'correctness' in plan.mode
          ? pickCorrectness(plan.mode.correctness, rand)
          : rand() > 0.5;

      const isMulti = question.question_type === 'MCQ_MULTI';

      const shownAt = new Date(startedAt.getTime() + i * 45_000);
      const answeredAt = isSubmitted
        ? new Date(shownAt.getTime() + (20 + Math.floor(rand() * 60)) * 1000)
        : isInProgress && i === plannedItemCount - 1
          ? null
          : new Date(shownAt.getTime() + (25 + Math.floor(rand() * 80)) * 1000);

      const selectionLog: Array<{ choice_id: string; at: string }> = [];

      const attemptItem = await prisma.attempt_items.create({
        data: {
          exam_attempts_id: attempt.exam_attempts_id,
          question_id: question.question_id,
          sequence_index: i,
          shown_at: shownAt,
          answered_at: answeredAt,
          theta_at_selection: thetaEstimate,
          time_per_item: answeredAt
            ? Math.floor((answeredAt.getTime() - shownAt.getTime()) / 1000)
            : null,
          choice_selection_log: selectionLog,
        },
      });

      if (!answeredAt) continue;

      let selectedChoices: typeof choices = [];

      if (isMulti) {
        if (shouldBeCorrect) {
          selectedChoices = correctChoices;
        } else {
          const pickCorrect = Math.min(
            correctChoices.length - 1,
            Math.max(0, Math.floor(rand() * correctChoices.length)),
          );
          const pickWrong = Math.min(
            wrongChoices.length,
            1 + Math.floor(rand() * 2),
          );
          selectedChoices = [
            ...correctChoices.slice(0, pickCorrect),
            ...wrongChoices.slice(0, pickWrong),
          ];
          if (selectedChoices.length === 0) {
            selectedChoices = [wrongChoices[0] ?? correctChoices[0]];
          }
        }
      } else {
        selectedChoices = shouldBeCorrect
          ? [correctChoices[0]]
          : [wrongChoices[0] ?? correctChoices[0]];
      }

      selectionLog.push(
        ...selectedChoices.map((c) => ({
          choice_id: c.choice_id.toString(),
          at: answeredAt.toISOString(),
        })),
      );

      await prisma.attempt_items.update({
        where: { attempt_items_id: attemptItem.attempt_items_id },
        data: { choice_selection_log: selectionLog },
      });

      const correctIds = new Set(correctChoices.map((c) => c.choice_id));
      const selectedIds = new Set(selectedChoices.map((c) => c.choice_id));
      const itemCorrect =
        correctIds.size === selectedIds.size &&
        [...correctIds].every((id) => selectedIds.has(id));
      if (itemCorrect) correctCount++;

      answeredIrtItems.push({
        question_id: question.question_id,
        sequence_index: i,
        difficulty_param: question.difficulty_param,
        discrimination_param: question.discrimination_param,
        guessing_param: question.guessing_param,
        is_correct: itemCorrect,
      });
      const thetaUpdate = updateTheta(thetaEstimate, answeredIrtItems);
      thetaEstimate = thetaUpdate.theta;
      standardError = thetaUpdate.standardError;
      testInformation = thetaUpdate.testInformation;

      for (const choice of selectedChoices) {
        await prisma.attempt_answers.create({
          data: {
            attempt_items_id: attemptItem.attempt_items_id,
            selected_choice_id: choice.choice_id,
            is_correct: isMulti ? itemCorrect : choice.is_correct,
            saved_at: answeredAt,
          },
        });
      }
    }

    if (isSubmitted) {
      const rawScore =
        administeredCount > 0 ? (correctCount / administeredCount) * 100 : 0;
      const passed = rawScore >= 50;

      await prisma.exam_attempts.update({
        where: { exam_attempts_id: attempt.exam_attempts_id },
        data: {
          total_score: rawScore.toFixed(2),
          passed,
          total_level: thetaEstimate,
          theta_estimate: thetaEstimate,
          standard_error: standardError,
          test_information: testInformation,
          adaptive_completed_at: submittedAt,
          adaptive_stop_reason: 'seeded_demo',
        },
      });
    } else if (answeredIrtItems.length > 0) {
      await prisma.exam_attempts.update({
        where: { exam_attempts_id: attempt.exam_attempts_id },
        data: {
          total_level: thetaEstimate,
          theta_estimate: thetaEstimate,
          standard_error: standardError,
          test_information: testInformation,
        },
      });
    }

    created++;
  }

  // Seed behavior logs for submitted and in-progress attempts
  const behaviorEvents = await seedBehaviorLogs();
  console.log(
    `Attempts: ${created} created, ${skipped} skipped, ${behaviorEvents} behavior events`,
  );
}

const BEHAVIOR_EVENT_TYPES = [
  'focus_change',
  'scroll',
  'copy',
  'idle',
  'resize',
];

async function seedBehaviorLogs(): Promise<number> {
  const attempts = await prisma.exam_attempts.findMany({
    where: { status: { in: ['SUBMITTED', 'IN_PROGRESS'] } },
    select: {
      exam_attempts_id: true,
      status: true,
      started_at: true,
      submitted_at: true,
      attempt_items: {
        select: {
          attempt_items_id: true,
          question_id: true,
        },
        orderBy: { sequence_index: 'asc' },
        take: 1,
      },
    },
  });

  // Skip attempts that already have behavior logs
  const existingLogCount = await prisma.exam_behavior_logs.count();
  if (existingLogCount > 0) {
    console.log(`Behavior logs: ${existingLogCount} already exist, skipping`);
    return existingLogCount;
  }

  let created = 0;
  for (const attempt of attempts) {
    const item = attempt.attempt_items[0];
    const endTime = attempt.submitted_at ?? new Date();
    const startTime = attempt.started_at;
    const durationMs = endTime.getTime() - startTime.getTime();

    // Generate 1-5 behavior events per attempt (deterministic based on attempt ID)
    const attemptIdNum = Number(attempt.exam_attempts_id);
    const eventCount = 1 + Math.floor(Math.abs(Math.sin(attemptIdNum)) * 5);

    for (let i = 0; i < eventCount; i++) {
      const eventType = BEHAVIOR_EVENT_TYPES[i % BEHAVIOR_EVENT_TYPES.length];
      const offset = Math.floor(
        ((i + 1) / BEHAVIOR_EVENT_TYPES.length) * durationMs,
      );
      const occurredAt = new Date(startTime.getTime() + offset);

      await prisma.exam_behavior_logs.create({
        data: {
          exam_attempts_id: attempt.exam_attempts_id,
          attempt_items_id: item?.attempt_items_id ?? null,
          question_id: item?.question_id ?? null,
          event_type: eventType,
          metadata:
            eventType === 'focus_change'
              ? { direction: i % 2 === 0 ? 'out' : 'in' }
              : eventType === 'idle'
                ? { duration_seconds: 30 + i * 15 }
                : undefined,
          occurred_at: occurredAt,
        },
      });
      created++;
    }
  }

  return created;
}
