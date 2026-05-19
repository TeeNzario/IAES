import { seedStaff } from './staff';
import { seedStudents } from './students';
import { seedCourses } from './courses';
import { seedKnowledge } from './knowledge';
import { seedQuestions } from './questions';
import { seedExams } from './exams';
import { seedAttempts } from './attempts';
import { DEMO_PASSWORD } from './constants';
import { prisma } from '../../src/lib/prisma';

async function seedAcademicSettings() {
  await prisma.academic_settings.upsert({
    where: { id: 1 },
    update: { academic_year: 2026, semester: 1 },
    create: { id: 1, academic_year: 2026, semester: 1 },
  });
  console.log('Academic settings: year=2026, semester=1');
}

async function main() {
  await seedAcademicSettings();
  const staff = await seedStaff();
  const students = await seedStudents();
  const { offerings } = await seedCourses(staff);
  await seedKnowledge(staff);
  const questions = await seedQuestions(staff);
  const exams = await seedExams(offerings, questions);
  await seedAttempts(exams);

  console.log('\nSeed completed');
  console.log(`Admin: ${staff.admins[0].email} / ${DEMO_PASSWORD}`);
  console.log(`Instructor: ${staff.instructors[0].email} / ${DEMO_PASSWORD}`);
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
