import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';

const DEMO_PASSWORD = '1234';
const FACULTY = {
  MANAGEMENT: 1,
  ACCOUNTING_FINANCE: 2,
  SCIENCE: 11,
  ENGINEERING_TECH: 12,
  INFORMATION_SCIENCE: 18,
} as const;

const CURRICULUM = {
  LOGISTICS: 'CUR002',
  ACCOUNTING: 'CUR008',
  CHEMISTRY: 'CUR033',
  COMPUTER_AI: 'CUR042',
  IT_DIGITAL_INNOVATION: 'CUR067',
} as const;

async function findOrCreateKnowledgeCategory(
  name: string,
  createdByStaffId: bigint,
) {
  const existing = await prisma.knowledge_categories.findFirst({
    where: { name },
  });

  if (existing) return existing;

  return prisma.knowledge_categories.create({
    data: {
      name,
      created_by_staff_id: createdByStaffId,
    },
  });
}

async function findOrCreateDemoCourse(instructorId: bigint) {
  const existing = await prisma.courses.findFirst({
    where: { course_code: 'IAES101' },
  });

  if (existing) {
    return prisma.courses.update({
      where: { courses_id: existing.courses_id },
      data: {
        course_name: 'Intelligent Adaptive Examination System',
        course_name_th: 'Intelligent Adaptive Examination System',
        course_name_en: 'Intelligent Adaptive Examination System',
        description: 'Demo course for local development',
        created_by_instructors_id: instructorId,
        is_active: true,
      },
    });
  }

  return prisma.courses.create({
    data: {
      course_code: 'IAES101',
      course_name: 'Intelligent Adaptive Examination System',
      course_name_th: 'Intelligent Adaptive Examination System',
      course_name_en: 'Intelligent Adaptive Examination System',
      description: 'Demo course for local development',
      created_by_instructors_id: instructorId,
      is_active: true,
    },
  });
}

async function findOrCreateCourse(
  courseCode: string,
  courseName: string,
  instructorId: bigint,
) {
  const existing = await prisma.courses.findFirst({
    where: { course_code: courseCode },
  });

  if (existing) {
    return prisma.courses.update({
      where: { courses_id: existing.courses_id },
      data: {
        course_name: courseName,
        course_name_th: courseName,
        course_name_en: courseName,
        is_active: true,
      },
    });
  }

  return prisma.courses.create({
    data: {
      course_code: courseCode,
      course_name: courseName,
      course_name_th: courseName,
      course_name_en: courseName,
      created_by_instructors_id: instructorId,
      is_active: true,
    },
  });
}

async function findOrCreateDemoOffering(courseId: bigint) {
  const existing = await prisma.course_offerings.findFirst({
    where: {
      courses_id: courseId,
      academic_year: 2026,
      semester: 1,
    },
  });

  if (existing) {
    return prisma.course_offerings.update({
      where: { course_offerings_id: existing.course_offerings_id },
      data: { is_active: true },
    });
  }

  return prisma.course_offerings.create({
    data: {
      courses_id: courseId,
      academic_year: 2026,
      semester: 1,
      is_active: true,
    },
  });
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const admin = await prisma.staff_users.upsert({
    where: { email: 'admin@iaes.local' },
    update: {
      password_hash: passwordHash,
      role: 'ADMIN',
      facultyCode: FACULTY.INFORMATION_SCIENCE,
      title: 'อาจารย์',
      curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
      first_name: 'กิตติ',
      last_name: 'ผู้ดูแลระบบ',
      is_active: true,
    },
    create: {
      email: 'admin@iaes.local',
      password_hash: passwordHash,
      role: 'ADMIN',
      facultyCode: FACULTY.INFORMATION_SCIENCE,
      title: 'อาจารย์',
      curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
      first_name: 'กิตติ',
      last_name: 'ผู้ดูแลระบบ',
      is_active: true,
    },
  });

  const instructor = await prisma.staff_users.upsert({
    where: { email: 'instructor@iaes.local' },
    update: {
      password_hash: passwordHash,
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.INFORMATION_SCIENCE,
      title: 'ดร.',
      curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
      first_name: 'อนุชา',
      last_name: 'สอนดี',
      is_active: true,
    },
    create: {
      email: 'instructor@iaes.local',
      password_hash: passwordHash,
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.INFORMATION_SCIENCE,
      title: 'ดร.',
      curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
      first_name: 'อนุชา',
      last_name: 'สอนดี',
      is_active: true,
    },
  });

  const students = [
    {
      student_code: '66131319',
      email: 'thanakrit.jaidee@example.com',
      password_hash: passwordHash,
      facultyCode: FACULTY.INFORMATION_SCIENCE,
      title: 'นาย',
      curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
      first_name: 'ธนกฤต',
      last_name: 'ใจดี',
      is_active: true,
    },
    {
      student_code: '66112233',
      email: 'papada.kaewmanee@example.com',
      password_hash: passwordHash,
      facultyCode: FACULTY.ACCOUNTING_FINANCE,
      title: 'นางสาว',
      curriculumId: CURRICULUM.ACCOUNTING,
      first_name: 'ปภาดา',
      last_name: 'แก้วมณี',
      is_active: true,
    },
    {
      student_code: '66554433',
      email: 'chayaphon.tangjai@example.com',
      password_hash: passwordHash,
      facultyCode: FACULTY.ENGINEERING_TECH,
      title: 'นาย',
      curriculumId: CURRICULUM.COMPUTER_AI,
      first_name: 'ชยพล',
      last_name: 'ตั้งใจ',
      is_active: false,
    },
    {
      student_code: '66121212',
      email: 'kanpitcha.srisuk@example.com',
      password_hash: passwordHash,
      facultyCode: FACULTY.SCIENCE,
      title: 'นางสาว',
      curriculumId: CURRICULUM.CHEMISTRY,
      first_name: 'กานต์พิชชา',
      last_name: 'ศรีสุข',
      is_active: true,
    },
    {
      student_code: '66131313',
      email: 'phakhin.logistics@example.com',
      password_hash: passwordHash,
      facultyCode: FACULTY.MANAGEMENT,
      title: 'นาย',
      curriculumId: CURRICULUM.LOGISTICS,
      first_name: 'ภาคิน',
      last_name: 'โลจิสติกส์',
      is_active: true,
    },
  ];

  for (const student of students) {
    await prisma.students.upsert({
      where: { student_code: student.student_code },
      update: student,
      create: student,
    });
  }

  const course = await findOrCreateDemoCourse(instructor.staff_users_id);
  const categories = await Promise.all([
    findOrCreateKnowledgeCategory(
      'Adaptive Testing',
      instructor.staff_users_id,
    ),
    findOrCreateKnowledgeCategory(
      'Item Response Theory',
      instructor.staff_users_id,
    ),
  ]);

  await prisma.course_knowledge.createMany({
    data: categories.map((category) => ({
      courses_id: course.courses_id,
      knowledge_category_id: category.knowledge_category_id,
    })),
    skipDuplicates: true,
  });

  const offering = await findOrCreateDemoOffering(course.courses_id);

  await prisma.course_instructors.createMany({
    data: [
      {
        course_offerings_id: offering.course_offerings_id,
        staff_users_id: instructor.staff_users_id,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.course_enrollments.createMany({
    data: students
      .filter((student) => student.is_active)
      .map((student) => ({
        course_offerings_id: offering.course_offerings_id,
        student_code: student.student_code,
      })),
    skipDuplicates: true,
  });

  const realCourses: Array<readonly [string, string]> = [
    ['COE64-233', 'Mobile Device Application Development'],
    ['COE64-305', 'Introduction to Signals and System'],
    ['COE64-325', 'Data Communication and Computer Network'],
    ['COE64-335', 'Machine Learning'],
    ['COE64-344', 'Data warehousing and data mining'],
    ['COE64-361', 'Convolutional Neural Networks'],
    ['COE64-367', 'Special Topics in Data Analytics II'],
    ['COE64-371', 'Front End Programming'],
    ['COE64-372', 'Back End Programming'],
    ['GED65-130', 'Introduction to Sociology'],
    ['STD-001', 'Standard Test (English)'],
    ['STD-002', 'Standard Test (IT)'],
    ['STD-003', 'Standard Test (Thai)'],
  ];

  for (const [code, name] of realCourses) {
    await findOrCreateCourse(code, name, instructor.staff_users_id);
  }

  console.log('Seed completed');
  console.log(`Admin: ${admin.email} / ${DEMO_PASSWORD}`);
  console.log(`Instructor: ${instructor.email} / ${DEMO_PASSWORD}`);
  console.log(`Student: ${students[0].student_code} / ${DEMO_PASSWORD}`);
  console.log(`Real courses seeded: ${realCourses.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
