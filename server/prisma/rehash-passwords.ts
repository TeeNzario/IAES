/**
 * One-shot migration: re-hash any password_hash row in staff_users or
 * students that is still stored as plain text (i.e. not bcrypt).
 *
 * Idempotent — safe to run repeatedly. Useful when bringing a staging /
 * production database forward after the auth.service started using bcrypt.
 *
 * Usage:
 *   npm run rehash-passwords            # report + rehash
 *   npm run rehash-passwords -- --dry   # report only, no writes
 */
import { prisma } from '../src/lib/prisma';
import { hashPassword, isHashed } from '../src/lib/password';

async function main() {
  const dryRun = process.argv.includes('--dry');

  const [staff, students] = await Promise.all([
    prisma.staff_users.findMany({
      select: { staff_users_id: true, email: true, password_hash: true },
    }),
    prisma.students.findMany({
      select: { student_code: true, password_hash: true },
    }),
  ]);

  const staffPlain = staff.filter((s) => !isHashed(s.password_hash));
  const studentsPlain = students.filter((s) => !isHashed(s.password_hash));

  console.log(
    `staff_users: ${staff.length} total, ${staffPlain.length} plain-text`,
  );
  console.log(
    `students: ${students.length} total, ${studentsPlain.length} plain-text`,
  );

  if (dryRun) {
    console.log('--dry: not writing');
    return;
  }

  for (const s of staffPlain) {
    const next = await hashPassword(s.password_hash);
    await prisma.staff_users.update({
      where: { staff_users_id: s.staff_users_id },
      data: { password_hash: next },
    });
    console.log(`  rehashed staff: ${s.email}`);
  }

  for (const s of studentsPlain) {
    const next = await hashPassword(s.password_hash);
    await prisma.students.update({
      where: { student_code: s.student_code },
      data: { password_hash: next },
    });
    console.log(`  rehashed student: ${s.student_code}`);
  }

  console.log(
    `Done. Rehashed ${staffPlain.length} staff + ${studentsPlain.length} students.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
