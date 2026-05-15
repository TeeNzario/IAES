import { exam_attempt_status } from '../../src/generated/prisma/client';
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
    mode === 'all' ? 1.0 : mode === 'most' ? 0.8 : mode === 'mixed' ? 0.5 : 0.25;
  return rand() < threshold;
}

export async function seedAttempts(
  exams: SeededExam[],
): Promise<void> {
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

    const answeredCount = isSubmitted
      ? totalQuestions
      : isInProgress
        ? Math.max(1, Math.floor(totalQuestions * (0.3 + rand() * 0.4)))
        : Math.max(1, Math.floor(totalQuestions * 0.2));

    const items = exam.questions.slice(0, answeredCount);
    let correctCount = 0;

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

    for (let i = 0; i < items.length; i++) {
      const question = items[i];
      const choices = await prisma.question_choices.findMany({
        where: { question_id: question.question_id },
        orderBy: { display_order: 'asc' },
      });
      if (choices.length === 0) continue;

      const correctChoices = choices.filter((c) => c.is_correct);
      const wrongChoices = choices.filter((c) => !c.is_correct);
      if (correctChoices.length === 0) continue;

      const shouldBeCorrect =
        isSubmitted && 'correctness' in plan.mode
          ? pickCorrectness(plan.mode.correctness, rand)
          : rand() > 0.5;

      const isMulti = question.question_type === 'MCQ_MULTI';

      const shownAt = new Date(startedAt.getTime() + i * 45_000);
      const answeredAt = isSubmitted
        ? new Date(shownAt.getTime() + (20 + Math.floor(rand() * 60)) * 1000)
        : isInProgress && i === items.length - 1
          ? null
          : new Date(shownAt.getTime() + (25 + Math.floor(rand() * 80)) * 1000);

      const selectionLog: Array<{ choice_id: string; at: string }> = [];

      const attemptItem = await prisma.attempt_items.create({
        data: {
          exam_attempts_id: attempt.exam_attempts_id,
          question_id: question.question_id,
          sequence_index: i + 1,
          shown_at: shownAt,
          answered_at: answeredAt,
          theta_at_selection: 0,
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
          const pickWrong = Math.min(wrongChoices.length, 1 + Math.floor(rand() * 2));
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

      for (const choice of selectedChoices) {
        await prisma.attempt_answers.create({
          data: {
            attempt_items_id: attemptItem.attempt_items_id,
            selected_choice_id: choice.choice_id,
            is_correct: isMulti
              ? itemCorrect
              : choice.is_correct,
            saved_at: answeredAt,
          },
        });
      }
    }

    if (isSubmitted) {
      const rawScore = items.length > 0 ? (correctCount / items.length) * 100 : 0;
      const passed = rawScore >= 50;
      const level =
        items.reduce((sum, q) => sum + (q.difficulty_param ?? 0), 0) /
        Math.max(1, items.length);

      await prisma.exam_attempts.update({
        where: { exam_attempts_id: attempt.exam_attempts_id },
        data: {
          total_score: rawScore.toFixed(2),
          passed,
          total_level: level,
          theta_estimate: level,
        },
      });
    }

    created++;
  }

  console.log(`Attempts: ${created} created, ${skipped} skipped`);
}
