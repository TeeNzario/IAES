import { seedStaff } from './staff';
import { seedStudents } from './students';
import { seedCourses } from './courses';
import { seedKnowledge } from './knowledge';
import { seedQuestions } from './questions';
import { seedExams } from './exams';
import { seedAttempts } from './attempts';
import { DEMO_PASSWORD } from './constants';
import { prisma } from '../../src/lib/prisma';

async function main() {
  const staff = await seedStaff();
  const students = await seedStudents();
  const { offerings } = await seedCourses(staff);
  await seedKnowledge(staff, offerings);
  const questions = await seedQuestions(staff, offerings);
  const exams = await seedExams(offerings, questions);
  await seedAttempts(exams, students);

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
