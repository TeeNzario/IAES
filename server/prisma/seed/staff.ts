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
      email: 'admin@wu.ac.th',
      role: 'ADMIN',
      facultyCode: FACULTY.INFORMATION_SCIENCE,
      curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
      title: 'อาจารย์',
      first_name: 'กิตติ',
      last_name: 'ผู้ดูแลระบบ',
    },
    {
      email: 'registrar@wu.ac.th',
      role: 'ADMIN',
      facultyCode: FACULTY.MANAGEMENT,
      curriculumId: CURRICULUM.LOGISTICS,
      title: 'นางสาว',
      first_name: 'พิมพ์ลดา',
      last_name: 'ศรีประเสริฐ',
    },
    {
      email: 'instructor@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.INFORMATION_SCIENCE,
      curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
      title: 'ดร.',
      first_name: 'อนุชา',
      last_name: 'สอนดี',
    },
    {
      email: 'somchai.engineer@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.ENGINEERING_TECH,
      curriculumId: CURRICULUM.COMPUTER_AI,
      title: 'รศ.ดร.',
      first_name: 'สมชาย',
      last_name: 'วิศวกรรม',
    },
    {
      email: 'napat.ai@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.ENGINEERING_TECH,
      curriculumId: CURRICULUM.COMPUTER_AI,
      title: 'ผศ.ดร.',
      first_name: 'ณภัทร',
      last_name: 'ปัญญากล้า',
    },
    {
      email: 'suda.science@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.SCIENCE,
      curriculumId: CURRICULUM.CHEMISTRY,
      title: 'ศ.ดร.',
      first_name: 'สุดา',
      last_name: 'เคมีวิทย์',
    },
    {
      email: 'pornchai.liberal@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.LIBERAL_ARTS,
      curriculumId: CURRICULUM.ENGLISH,
      title: 'อาจารย์',
      first_name: 'พรชัย',
      last_name: 'ภาษาเก่ง',
    },
    {
      email: 'kanokwan.mgmt@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.MANAGEMENT,
      curriculumId: CURRICULUM.DIGITAL_MARKETING,
      title: 'ผศ.',
      first_name: 'กนกวรรณ',
      last_name: 'ธุรกิจดี',
    },
    {
      email: 'retired.instructor@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.SCIENCE,
      curriculumId: CURRICULUM.BIOLOGY,
      title: 'ดร.',
      first_name: 'บรรจง',
      last_name: 'พักการสอน',
      is_active: false,
    },
    // --- Additional instructors for all faculties ---
    {
      email: 'anecha.agri@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.AGRI_FOOD,
      curriculumId: CURRICULUM.FOOD_SCIENCE,
      title: 'ผศ.ดร.',
      first_name: 'อเนชา',
      last_name: 'เกษตรดิจิทัล',
    },
    {
      email: 'supoj.med@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.MEDICINE,
      curriculumId: CURRICULUM.MEDICAL_TECH,
      title: 'ศ.นพ.',
      first_name: 'สุพจน์',
      last_name: 'แพทย์ก้าวหน้า',
    },
    {
      email: 'patcharee.pharma@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.PHARMACY,
      curriculumId: CURRICULUM.MEDICAL_TECH,
      title: 'รศ.ดร.ภญ.',
      first_name: 'พัชรี',
      last_name: 'เภสัชพัฒนา',
    },
    {
      email: 'somsak.polisci@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.POLITICAL_SCIENCE,
      curriculumId: CURRICULUM.LAW,
      title: 'รศ.ดร.',
      first_name: 'สมศักดิ์',
      last_name: 'รัฐศาสตร์',
    },
    {
      email: 'thipwan.dent@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.DENTISTRY,
      curriculumId: CURRICULUM.MEDICAL_TECH,
      title: 'ผศ.ทพญ.',
      first_name: 'ทิพวัลย์',
      last_name: 'ทันตาภิบาล',
    },
    {
      email: 'wichai.vet@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.VETERINARY,
      curriculumId: CURRICULUM.MEDICAL_TECH,
      title: 'รศ.น.สพ.',
      first_name: 'วิชัย',
      last_name: 'สัตวแพทย์',
    },
    {
      email: 'preeda.edu@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.EDUCATION,
      curriculumId: CURRICULUM.ENGLISH,
      title: 'ดร.',
      first_name: 'ปรีดา',
      last_name: 'ศึกษาศาสตร์',
    },
    {
      email: 'sirirat.publichealth@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.PUBLIC_HEALTH,
      curriculumId: CURRICULUM.NURSING,
      title: 'ศ.ดร.',
      first_name: 'สิริรัตน์',
      last_name: 'สาธารณสุข',
    },
    {
      email: 'natthapong.arch@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.ARCHITECTURE,
      curriculumId: CURRICULUM.MULTIMEDIA,
      title: 'ผศ.ดร.',
      first_name: 'ณัฐพงศ์',
      last_name: 'สถาปัตยกรรม',
    },
    {
      email: 'pimjai.allied@wu.ac.th',
      role: 'INSTRUCTOR',
      facultyCode: FACULTY.ALLIED_HEALTH,
      curriculumId: CURRICULUM.MEDICAL_TECH,
      title: 'อาจารย์',
      first_name: 'พิมพ์ใจ',
      last_name: 'เทคนิคการแพทย์',
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
