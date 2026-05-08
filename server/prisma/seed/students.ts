import { students } from '../../src/generated/prisma/client';
import { prisma } from '../../src/lib/prisma';
import { CURRICULUM, FACULTY, getDemoPasswordHash } from './constants';

type StudentSeed = {
  student_code: string;
  email: string;
  facultyCode: number;
  curriculumId: string;
  title: string;
  first_name: string;
  last_name: string;
  is_active?: boolean;
};

const STUDENT_ROWS: StudentSeed[] = [
  {
    student_code: '63131101',
    email: 'tharadon.english@example.com',
    facultyCode: FACULTY.LIBERAL_ARTS,
    curriculumId: CURRICULUM.ENGLISH,
    title: 'นาย',
    first_name: 'ธราดล',
    last_name: 'อิงลิช',
  },
  {
    student_code: '63131102',
    email: 'napaporn.thai@example.com',
    facultyCode: FACULTY.LIBERAL_ARTS,
    curriculumId: CURRICULUM.THAI_LANG,
    title: 'นางสาว',
    first_name: 'นภาพร',
    last_name: 'อักษรศาสตร์',
  },
  {
    student_code: '64121201',
    email: 'worawit.chem@example.com',
    facultyCode: FACULTY.SCIENCE,
    curriculumId: CURRICULUM.CHEMISTRY,
    title: 'นาย',
    first_name: 'วรวิทย์',
    last_name: 'อะตอม',
  },
  {
    student_code: '64121202',
    email: 'patcharin.bio@example.com',
    facultyCode: FACULTY.SCIENCE,
    curriculumId: CURRICULUM.BIOLOGY,
    title: 'นางสาว',
    first_name: 'พัชรินทร์',
    last_name: 'เซลล์ดี',
  },
  {
    student_code: '64250101',
    email: 'anuwat.civil@example.com',
    facultyCode: FACULTY.ENGINEERING_TECH,
    curriculumId: CURRICULUM.CIVIL_ENG,
    title: 'นาย',
    first_name: 'อนุวัฒน์',
    last_name: 'สร้างตึก',
  },
  {
    student_code: '65210301',
    email: 'sirilak.marketing@example.com',
    facultyCode: FACULTY.MANAGEMENT,
    curriculumId: CURRICULUM.DIGITAL_MARKETING,
    title: 'นางสาว',
    first_name: 'ศิริลักษณ์',
    last_name: 'ตลาดสด',
  },
  {
    student_code: '65210302',
    email: 'piyawat.tourism@example.com',
    facultyCode: FACULTY.MANAGEMENT,
    curriculumId: CURRICULUM.TOURISM_DIGITAL,
    title: 'นาย',
    first_name: 'ปิยวัฒน์',
    last_name: 'เที่ยวไทย',
  },
  {
    student_code: '65220101',
    email: 'kittikorn.multimedia@example.com',
    facultyCode: FACULTY.INFORMATION_SCIENCE,
    curriculumId: CURRICULUM.MULTIMEDIA,
    title: 'นาย',
    first_name: 'กิตติกร',
    last_name: 'มัลติมีเดีย',
  },
  {
    student_code: '65250101',
    email: 'jiraporn.elec@example.com',
    facultyCode: FACULTY.ENGINEERING_TECH,
    curriculumId: CURRICULUM.ELECTRICAL_ENG,
    title: 'นางสาว',
    first_name: 'จิราพร',
    last_name: 'ไฟฟ้าดี',
  },
  {
    student_code: '66112233',
    email: 'papada.kaewmanee@example.com',
    facultyCode: FACULTY.ACCOUNTING_FINANCE,
    curriculumId: CURRICULUM.ACCOUNTING,
    title: 'นางสาว',
    first_name: 'ปภาดา',
    last_name: 'แก้วมณี',
  },
  {
    student_code: '66121212',
    email: 'kanpitcha.srisuk@example.com',
    facultyCode: FACULTY.SCIENCE,
    curriculumId: CURRICULUM.CHEMISTRY,
    title: 'นางสาว',
    first_name: 'กานต์พิชชา',
    last_name: 'ศรีสุข',
  },
  {
    student_code: '66131313',
    email: 'phakhin.logistics@example.com',
    facultyCode: FACULTY.MANAGEMENT,
    curriculumId: CURRICULUM.LOGISTICS,
    title: 'นาย',
    first_name: 'ภาคิน',
    last_name: 'โลจิสติกส์',
  },
  {
    student_code: '66131319',
    email: 'thanakrit.jaidee@example.com',
    facultyCode: FACULTY.INFORMATION_SCIENCE,
    curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
    title: 'นาย',
    first_name: 'ธนกฤต',
    last_name: 'ใจดี',
  },
  {
    student_code: '66131320',
    email: 'suphawadee.medinfo@example.com',
    facultyCode: FACULTY.INFORMATION_SCIENCE,
    curriculumId: CURRICULUM.MEDICAL_INFO,
    title: 'นางสาว',
    first_name: 'สุภาวดี',
    last_name: 'เวชสาร',
  },
  {
    student_code: '66131321',
    email: 'arthit.digicomm@example.com',
    facultyCode: FACULTY.INFORMATION_SCIENCE,
    curriculumId: CURRICULUM.DIGITAL_COMM,
    title: 'นาย',
    first_name: 'อาทิตย์',
    last_name: 'นิเทศดิจิทัล',
  },
  {
    student_code: '66140101',
    email: 'wannapha.law@example.com',
    facultyCode: FACULTY.LAW,
    curriculumId: CURRICULUM.LAW,
    title: 'นางสาว',
    first_name: 'วรรณภา',
    last_name: 'นิติกร',
  },
  {
    student_code: '66170201',
    email: 'chalermchai.nurse@example.com',
    facultyCode: FACULTY.NURSING,
    curriculumId: CURRICULUM.NURSING,
    title: 'นาย',
    first_name: 'เฉลิมชัย',
    last_name: 'พยาบาลใจดี',
  },
  {
    student_code: '66250102',
    email: 'ratchanon.ai@example.com',
    facultyCode: FACULTY.ENGINEERING_TECH,
    curriculumId: CURRICULUM.COMPUTER_AI,
    title: 'นาย',
    first_name: 'รัชชานนท์',
    last_name: 'ปัญญาประดิษฐ์',
  },
  {
    student_code: '66250103',
    email: 'benjamas.ai@example.com',
    facultyCode: FACULTY.ENGINEERING_TECH,
    curriculumId: CURRICULUM.COMPUTER_AI,
    title: 'นางสาว',
    first_name: 'เบญจมาศ',
    last_name: 'อัลกอริทึม',
  },
  {
    student_code: '66250104',
    email: 'natthawut.ai@example.com',
    facultyCode: FACULTY.ENGINEERING_TECH,
    curriculumId: CURRICULUM.COMPUTER_AI,
    title: 'นาย',
    first_name: 'ณัฐวุฒิ',
    last_name: 'โมเดลเก่ง',
  },
  {
    student_code: '66220501',
    email: 'nantapong.it@example.com',
    facultyCode: FACULTY.INFORMATION_SCIENCE,
    curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
    title: 'นาย',
    first_name: 'นันทพงศ์',
    last_name: 'ไอทีพลัส',
  },
  {
    student_code: '66220502',
    email: 'ratchaneekorn.it@example.com',
    facultyCode: FACULTY.INFORMATION_SCIENCE,
    curriculumId: CURRICULUM.IT_DIGITAL_INNOVATION,
    title: 'นางสาว',
    first_name: 'รัชนีกร',
    last_name: 'คลาวด์',
  },
  {
    student_code: '66110701',
    email: 'pranee.chinese@example.com',
    facultyCode: FACULTY.LIBERAL_ARTS,
    curriculumId: CURRICULUM.CHINESE,
    title: 'นาง',
    first_name: 'ปราณี',
    last_name: 'จีนกลาง',
  },
  {
    student_code: '66554433',
    email: 'chayaphon.tangjai@example.com',
    facultyCode: FACULTY.ENGINEERING_TECH,
    curriculumId: CURRICULUM.COMPUTER_AI,
    title: 'นาย',
    first_name: 'ชยพล',
    last_name: 'ตั้งใจ',
    is_active: false,
  },
  {
    student_code: '65150101',
    email: 'thanawat.dropout@example.com',
    facultyCode: FACULTY.LAW,
    curriculumId: CURRICULUM.LAW,
    title: 'นาย',
    first_name: 'ธนวัฒน์',
    last_name: 'พักการเรียน',
    is_active: false,
  },
];

export async function seedStudents(): Promise<students[]> {
  const passwordHash = await getDemoPasswordHash();
  const upserted: students[] = [];

  for (const row of STUDENT_ROWS) {
    const record = await prisma.students.upsert({
      where: { student_code: row.student_code },
      update: {
        email: row.email,
        password_hash: passwordHash,
        facultyCode: row.facultyCode,
        curriculumId: row.curriculumId,
        title: row.title,
        first_name: row.first_name,
        last_name: row.last_name,
        is_active: row.is_active ?? true,
      },
      create: {
        student_code: row.student_code,
        email: row.email,
        password_hash: passwordHash,
        facultyCode: row.facultyCode,
        curriculumId: row.curriculumId,
        title: row.title,
        first_name: row.first_name,
        last_name: row.last_name,
        is_active: row.is_active ?? true,
      },
    });
    upserted.push(record);

    await prisma.student_directory.upsert({
      where: { email: row.email },
      update: {
        student_code: row.student_code,
        first_name: row.first_name,
        last_name: row.last_name,
        is_active: row.is_active ?? true,
      },
      create: {
        student_code: row.student_code,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        is_active: row.is_active ?? true,
      },
    });
  }

  const activeCount = upserted.filter((s) => s.is_active).length;
  console.log(
    `Students: ${upserted.length} (active=${activeCount}, inactive=${upserted.length - activeCount})`,
  );

  return upserted;
}
