import { course_exams, question_bank } from '../../src/generated/prisma/client';
import { prisma } from '../../src/lib/prisma';
import { SeededCourses } from './courses';
import { SeededQuestions } from './questions';

type ExamSeed = {
  courseCode: string;
  academic_year: number;
  semester: number;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  show_results_immediately: boolean;
  is_active: boolean;
  collectionKeys: string[];
};

const now = new Date();
const pastDate = (daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 86_400_000);
const futureDate = (daysAhead: number) =>
  new Date(now.getTime() + daysAhead * 86_400_000);

const EXAMS: ExamSeed[] = [
  {
    courseCode: 'COE64-335',
    academic_year: 2026,
    semester: 1,
    title: 'กลางภาค Machine Learning',
    description: 'ข้อสอบกลางภาค ครอบคลุมบทที่ 1-5',
    start_time: pastDate(30),
    end_time: pastDate(29),
    show_results_immediately: true,
    is_active: true,
    collectionKeys: ['ML-2026-MID'],
  },
  {
    courseCode: 'COE64-335',
    academic_year: 2026,
    semester: 1,
    title: 'ปลายภาค Machine Learning',
    description: 'ข้อสอบปลายภาค ครอบคลุมทุกบท',
    start_time: pastDate(5),
    end_time: pastDate(4),
    show_results_immediately: false,
    is_active: true,
    collectionKeys: ['ML-2026-FIN'],
  },
  {
    courseCode: 'COE64-371',
    academic_year: 2026,
    semester: 1,
    title: 'แบบทดสอบย่อย 1 — HTML/CSS/JS',
    start_time: pastDate(45),
    end_time: pastDate(44),
    show_results_immediately: true,
    is_active: true,
    collectionKeys: ['FE-2026-QUIZ'],
  },
  {
    courseCode: 'COE64-371',
    academic_year: 2026,
    semester: 1,
    title: 'กลางภาค Front End',
    description: 'React, TypeScript, State Management',
    start_time: pastDate(20),
    end_time: pastDate(19),
    show_results_immediately: true,
    is_active: true,
    collectionKeys: ['FE-2026-MID'],
  },
  {
    courseCode: 'COE64-372',
    academic_year: 2026,
    semester: 2,
    title: 'กลางภาค Back End',
    description: 'REST API, Database, Security',
    start_time: futureDate(10),
    end_time: futureDate(11),
    show_results_immediately: false,
    is_active: true,
    collectionKeys: ['BE-2026-MID'],
  },
  {
    courseCode: 'COE64-325',
    academic_year: 2026,
    semester: 1,
    title: 'กลางภาค Network',
    start_time: pastDate(15),
    end_time: pastDate(14),
    show_results_immediately: true,
    is_active: true,
    collectionKeys: ['NET-2026-MID'],
  },
  {
    courseCode: 'COE64-344',
    academic_year: 2026,
    semester: 1,
    title: 'กลางภาค Data Warehouse',
    start_time: pastDate(10),
    end_time: pastDate(9),
    show_results_immediately: false,
    is_active: true,
    collectionKeys: ['DW-2026-MID'],
  },
  {
    courseCode: 'COE64-367',
    academic_year: 2026,
    semester: 2,
    title: 'กลางภาค Data Visualization',
    start_time: futureDate(30),
    end_time: futureDate(31),
    show_results_immediately: false,
    is_active: false,
    collectionKeys: ['VIZ-2026-MID'],
  },
  {
    courseCode: 'STD-002',
    academic_year: 2026,
    semester: 1,
    title: 'แบบทดสอบมาตรฐาน IT',
    start_time: pastDate(60),
    end_time: futureDate(60),
    show_results_immediately: true,
    is_active: true,
    collectionKeys: ['STD-IT-MAIN'],
  },
  {
    courseCode: 'STD-001',
    academic_year: 2026,
    semester: 1,
    title: 'แบบทดสอบมาตรฐาน English',
    start_time: pastDate(60),
    end_time: futureDate(60),
    show_results_immediately: true,
    is_active: true,
    collectionKeys: ['STD-EN-MAIN'],
  },
  {
    courseCode: 'COE64-233',
    academic_year: 2025,
    semester: 2,
    title: 'ปลายภาค Mobile Development',
    description: 'ข้อสอบปลายภาค ครอบคลุมการพัฒนา Mobile Application',
    start_time: pastDate(120),
    end_time: pastDate(119),
    show_results_immediately: true,
    is_active: true,
    collectionKeys: ['MOB-2025-FIN'],
  },
  {
    courseCode: 'COE64-305',
    academic_year: 2026,
    semester: 1,
    title: 'กลางภาค Signals and Systems',
    description: 'ข้อสอบกลางภาค สัญญาณและระบบเบื้องต้น',
    start_time: pastDate(25),
    end_time: pastDate(24),
    show_results_immediately: true,
    is_active: true,
    collectionKeys: ['SIG-2026-MID'],
  },
  {
    courseCode: 'GED65-130',
    academic_year: 2026,
    semester: 1,
    title: 'กลางภาค สังคมวิทยาเบื้องต้น',
    description: 'ข้อสอบกลางภาค รายวิชาสังคมวิทยาเบื้องต้น',
    start_time: pastDate(35),
    end_time: pastDate(34),
    show_results_immediately: false,
    is_active: true,
    collectionKeys: ['SOC-2026-MID'],
  },
  {
    courseCode: 'STD-003',
    academic_year: 2026,
    semester: 1,
    title: 'แบบทดสอบมาตรฐาน ภาษาไทย',
    description: 'แบบทดสอบมาตรฐานสำหรับประเมินทักษะภาษาไทย',
    start_time: pastDate(60),
    end_time: futureDate(60),
    show_results_immediately: true,
    is_active: true,
    collectionKeys: ['STD-TH-MAIN'],
  },
  {
    courseCode: 'COE64-361',
    academic_year: 2026,
    semester: 1,
    title: 'กลางภาค Convolutional Neural Networks',
    description: 'ข้อสอบกลางภาค ครอบคลุม CNN Architecture และ Image Processing',
    start_time: pastDate(18),
    end_time: pastDate(17),
    show_results_immediately: true,
    is_active: true,
    collectionKeys: ['CNN-2026-MID'],
  },
];

export interface SeededExam {
  exam: course_exams;
  questions: question_bank[];
  courseCode: string;
}

export async function seedExams(
  offerings: SeededCourses['offerings'],
  seededQuestions: SeededQuestions,
): Promise<SeededExam[]> {
  const offeringLookup = new Map(
    offerings.map((o) => [
      `${o.courseCode}-${o.academic_year}-${o.semester}`,
      o.offering,
    ]),
  );

  const seededExams: SeededExam[] = [];

  for (const seed of EXAMS) {
    const key = `${seed.courseCode}-${seed.academic_year}-${seed.semester}`;
    const offering = offeringLookup.get(key);
    if (!offering) continue;

    const existing = await prisma.course_exams.findFirst({
      where: {
        course_offerings_id: offering.course_offerings_id,
        title: seed.title,
      },
    });

    let exam: course_exams;
    if (existing) {
      exam = await prisma.course_exams.update({
        where: { course_exams_id: existing.course_exams_id },
        data: {
          description: seed.description ?? null,
          start_time: seed.start_time,
          end_time: seed.end_time,
          show_results_immediately: seed.show_results_immediately,
          is_active: seed.is_active,
          is_published: true,
        },
      });
    } else {
      exam = await prisma.course_exams.create({
        data: {
          course_offerings_id: offering.course_offerings_id,
          title: seed.title,
          description: seed.description,
          start_time: seed.start_time,
          end_time: seed.end_time,
          show_results_immediately: seed.show_results_immediately,
          is_active: seed.is_active,
          is_published: true,
        },
      });
    }

    const questions: question_bank[] = [];
    for (const collKey of seed.collectionKeys) {
      const qs = seededQuestions.questionsByCollection.get(collKey) ?? [];
      questions.push(...qs);
    }

    if (questions.length > 0) {
      await prisma.exam_questions.deleteMany({
        where: { course_exams_id: exam.course_exams_id },
      });
      await prisma.exam_questions.createMany({
        data: questions.map((q, idx) => ({
          course_exams_id: exam.course_exams_id,
          question_id: q.question_id,
          sequence_index: idx + 1,
        })),
      });
    }

    seededExams.push({ exam, questions, courseCode: seed.courseCode });
  }

  console.log(`Exams: ${seededExams.length} (with exam_questions linked)`);

  return seededExams;
}
