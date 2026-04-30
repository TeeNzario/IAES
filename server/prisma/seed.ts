import { prisma } from '../src/lib/prisma';

const DEMO_PASSWORD = '1234';

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
  const admin = await prisma.staff_users.upsert({
    where: { email: 'admin@iaes.local' },
    update: {
      password_hash: DEMO_PASSWORD,
      role: 'ADMIN',
      facultyCode: 1,
      first_name: 'Admin',
      last_name: 'User',
      is_active: true,
    },
    create: {
      email: 'admin@iaes.local',
      password_hash: DEMO_PASSWORD,
      role: 'ADMIN',
      facultyCode: 1,
      first_name: 'Admin',
      last_name: 'User',
      is_active: true,
    },
  });

  const instructor = await prisma.staff_users.upsert({
    where: { email: 'instructor@iaes.local' },
    update: {
      password_hash: DEMO_PASSWORD,
      role: 'INSTRUCTOR',
      facultyCode: 1,
      first_name: 'Demo',
      last_name: 'Instructor',
      is_active: true,
    },
    create: {
      email: 'instructor@iaes.local',
      password_hash: DEMO_PASSWORD,
      role: 'INSTRUCTOR',
      facultyCode: 1,
      first_name: 'Demo',
      last_name: 'Instructor',
      is_active: true,
    },
  });

  const students = [
    {
      student_code: '66131319',
      email: 'john.doe@example.com',
      password_hash: DEMO_PASSWORD,
      facultyCode: 1,
      first_name: 'John',
      last_name: 'Doe',
      is_active: true,
    },
    {
      student_code: '66112233',
      email: 'jane.smith@example.com',
      password_hash: DEMO_PASSWORD,
      facultyCode: 1,
      first_name: 'Jane',
      last_name: 'Smith',
      is_active: true,
    },
    {
      student_code: '66554433',
      email: 'alex.brown@example.com',
      password_hash: DEMO_PASSWORD,
      facultyCode: 1,
      first_name: 'Alex',
      last_name: 'Brown',
      is_active: false,
    },
    {
      student_code: '66121212',
      email: 'emma.wilson@example.com',
      password_hash: DEMO_PASSWORD,
      facultyCode: 1,
      first_name: 'Emma',
      last_name: 'Wilson',
      is_active: true,
    },
    {
      student_code: '66131313',
      email: 'michael.lee@example.com',
      password_hash: DEMO_PASSWORD,
      facultyCode: 1,
      first_name: 'Michael',
      last_name: 'Lee',
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

  console.log('Seed completed');
  console.log(`Admin: ${admin.email} / ${DEMO_PASSWORD}`);
  console.log(`Instructor: ${instructor.email} / ${DEMO_PASSWORD}`);
  console.log(`Student: ${students[0].student_code} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
