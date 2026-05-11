import { staff_users } from '../../src/generated/prisma/client';
import { prisma } from '../../src/lib/prisma';
import { CURRICULUM, FACULTY, getDemoPasswordHash } from './constants';

export interface SeededStaff {
  admins: staff_users[];
  instructors: staff_users[];
  all: staff_users[];
}

type StaffSeed = {
  email: string;
  role: 'ADMIN' | 'INSTRUCTOR';
  facultyCode: number;
  curriculumId: string;
  title: string;
  first_name: string;
  last_name: string;
  is_active?: boolean;
};

export async function seedStaff(): Promise<SeededStaff> {
  const passwordHash = await getDemoPasswordHash();

  const rows: StaffSeed[] = [
    {
      email: 'admin@iaes.local',
      role: 'ADMIN',
      facultyCode: FACULTY.INFORMATION_SCIENCE,
      curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
      title: 'อาจารย์',
      first_name: 'กิตติ',
      last_name: 'ผู้ดูแลระบบ',
    },
    {
      email: 'registrar@iaes.local',
      role: 'ADMIN',
      facultyCode: FACULTY.MANAGEMENT,
      curriculumId: CURRICULUM.LOGISTICS,
      title: 'นางสาว',
      first_name: 'พิมพ์ลดา',
      last_name: 'ศรีประเสริฐ',
    },
    {
      email: 'instructor@iaes.local',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.INFORMATION_SCIENCE,
      curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
      title: 'ดร.',
      first_name: 'อนุชา',
      last_name: 'สอนดี',
    },
    {
      email: 'somchai.engineer@iaes.local',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.ENGINEERING_TECH,
      curriculumId: CURRICULUM.COMPUTER_AI,
      title: 'รศ.ดร.',
      first_name: 'สมชาย',
      last_name: 'วิศวกรรม',
    },
    {
      email: 'napat.ai@iaes.local',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.ENGINEERING_TECH,
      curriculumId: CURRICULUM.COMPUTER_AI,
      title: 'ผศ.ดร.',
      first_name: 'ณภัทร',
      last_name: 'ปัญญากล้า',
    },
    {
      email: 'suda.science@iaes.local',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.SCIENCE,
      curriculumId: CURRICULUM.CHEMISTRY,
      title: 'ศ.ดร.',
      first_name: 'สุดา',
      last_name: 'เคมีวิทย์',
    },
    {
      email: 'pornchai.liberal@iaes.local',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.LIBERAL_ARTS,
      curriculumId: CURRICULUM.ENGLISH,
      title: 'อาจารย์',
      first_name: 'พรชัย',
      last_name: 'ภาษาเก่ง',
    },
    {
      email: 'kanokwan.mgmt@iaes.local',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.MANAGEMENT,
      curriculumId: CURRICULUM.DIGITAL_MARKETING,
      title: 'ผศ.',
      first_name: 'กนกวรรณ',
      last_name: 'ธุรกิจดี',
    },
    {
      email: 'retired.instructor@iaes.local',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.SCIENCE,
      curriculumId: CURRICULUM.BIOLOGY,
      title: 'ดร.',
      first_name: 'บรรจง',
      last_name: 'พักการสอน',
      is_active: false,
    },
  ];

  const upserted: staff_users[] = [];

  for (const row of rows) {
    const record = await prisma.staff_users.upsert({
      where: { email: row.email },
      update: {
        password_hash: passwordHash,
        role: row.role,
        facultyCode: row.facultyCode,
        curriculumId: row.curriculumId,
        title: row.title,
        first_name: row.first_name,
        last_name: row.last_name,
        is_active: row.is_active ?? true,
      },
      create: {
        email: row.email,
        password_hash: passwordHash,
        role: row.role,
        facultyCode: row.facultyCode,
        curriculumId: row.curriculumId,
        title: row.title,
        first_name: row.first_name,
        last_name: row.last_name,
        is_active: row.is_active ?? true,
      },
    });
    upserted.push(record);
  }

  const admins = upserted.filter((s) => s.role === 'ADMIN');
  const instructors = upserted.filter((s) => s.role === 'INSTRUCTOR');

  console.log(
    `Staff: ${upserted.length} (admins=${admins.length}, instructors=${instructors.length})`,
  );

  return { admins, instructors, all: upserted };
}
