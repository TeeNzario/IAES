import { prisma } from "../src/lib/prisma"

async function main() {
  await prisma.students.createMany({
    data: [
      {
        student_code: 'STU001',
        email: 'john.doe@example.com',
        password_hash: '1234',
        first_name: 'John',
        last_name: 'Doe',
        is_active: true,
      },
      {
        student_code: 'STU002',
        email: 'jane.smith@example.com',
        password_hash: '1234',
        first_name: 'Jane',
        last_name: 'Smith',
        is_active: true,
      },
      {
        student_code: 'STU003',
        email: 'alex.brown@example.com',
        password_hash: '1234',
        first_name: 'Alex',
        last_name: 'Brown',
        is_active: false,
      },
      {
        student_code: 'STU004',
        email: 'emma.wilson@example.com',
        password_hash: '1234',
        first_name: 'Emma',
        last_name: 'Wilson',
        is_active: true,
      },
      {
        student_code: 'STU005',
        email: 'michael.lee@example.com',
        password_hash: '1234',
        first_name: 'Michael',
        last_name: 'Lee',
        is_active: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log('5 mock students inserted');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });