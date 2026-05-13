import {
  course_offerings,
  courses,
  staff_users,
} from '../../src/generated/prisma/client';
import { prisma } from '../../src/lib/prisma';
import { SeededStaff } from './staff';

type CourseSeed = {
  code: string;
  name_th: string;
  name_en: string;
  description?: string;
};

type OfferingSeed = {
  courseCode: string;
  academic_year: number;
  semester: number;
  is_active?: boolean;
  instructorEmails: string[];
  studentCodes: string[];
};

const COURSES: CourseSeed[] = [
  {
    code: 'COE64-233',
    name_th: 'การพัฒนาโปรแกรมบนอุปกรณ์เคลื่อนที่',
    name_en: 'Mobile Device Application Development',
    description:
      'การออกแบบและพัฒนาแอปพลิเคชันบนอุปกรณ์เคลื่อนที่ ระบบปฏิบัติการ Android และ iOS',
  },
  {
    code: 'COE64-305',
    name_th: 'สัญญาณและระบบเบื้องต้น',
    name_en: 'Introduction to Signals and System',
    description: 'พื้นฐานของสัญญาณ ระบบเชิงเส้น และการแปลงสัญญาณ',
  },
  {
    code: 'COE64-325',
    name_th: 'การสื่อสารข้อมูลและเครือข่ายคอมพิวเตอร์',
    name_en: 'Data Communication and Computer Network',
    description:
      'โปรโตคอลเครือข่าย รูปแบบการสื่อสารข้อมูล และการออกแบบเครือข่าย',
  },
  {
    code: 'COE64-335',
    name_th: 'การเรียนรู้ของเครื่อง',
    name_en: 'Machine Learning',
    description:
      'แนวคิดและอัลกอริทึมการเรียนรู้ของเครื่อง ทั้งแบบมีและไม่มีผู้สอน',
  },
  {
    code: 'COE64-344',
    name_th: 'คลังข้อมูลและการทำเหมืองข้อมูล',
    name_en: 'Data warehousing and data mining',
    description:
      'การออกแบบคลังข้อมูล ETL และเทคนิคการทำเหมืองข้อมูลในองค์กร',
  },
  {
    code: 'COE64-361',
    name_th: 'โครงข่ายประสาทเทียมแบบคอนโวลูชัน',
    name_en: 'Convolutional Neural Networks',
    description: 'สถาปัตยกรรม CNN และการประยุกต์ใช้กับงานด้านภาพ',
  },
  {
    code: 'COE64-367',
    name_th: 'หัวข้อพิเศษทางการวิเคราะห์ข้อมูล 2',
    name_en: 'Special Topics in Data Analytics II',
    description:
      'หัวข้อเชิงลึกด้านการวิเคราะห์ข้อมูลและการสร้างภาพข้อมูล (Data Visualization)',
  },
  {
    code: 'COE64-371',
    name_th: 'การเขียนโปรแกรมฝั่งหน้าบ้าน',
    name_en: 'Front End Programming',
    description: 'HTML, CSS, JavaScript และเฟรมเวิร์กสมัยใหม่ เช่น React',
  },
  {
    code: 'COE64-372',
    name_th: 'การเขียนโปรแกรมฝั่งเซิร์ฟเวอร์',
    name_en: 'Back End Programming',
    description: 'การออกแบบ REST API ฐานข้อมูล และการยืนยันตัวตน',
  },
  {
    code: 'GED65-130',
    name_th: 'สังคมวิทยาเบื้องต้น',
    name_en: 'Introduction to Sociology',
    description: 'แนวคิดพื้นฐานของสังคมวิทยาและโครงสร้างทางสังคม',
  },
  {
    code: 'STD-001',
    name_th: 'แบบทดสอบมาตรฐาน (ภาษาอังกฤษ)',
    name_en: 'Standard Test (English)',
    description: 'ชุดแบบทดสอบมาตรฐานสำหรับประเมินทักษะภาษาอังกฤษ',
  },
  {
    code: 'STD-002',
    name_th: 'แบบทดสอบมาตรฐาน (ไอที)',
    name_en: 'Standard Test (IT)',
    description:
      'ชุดแบบทดสอบมาตรฐานสำหรับประเมินทักษะด้านเทคโนโลยีสารสนเทศ',
  },
  {
    code: 'STD-003',
    name_th: 'แบบทดสอบมาตรฐาน (ภาษาไทย)',
    name_en: 'Standard Test (Thai)',
    description: 'ชุดแบบทดสอบมาตรฐานสำหรับประเมินทักษะภาษาไทย',
  },
];

const OFFERINGS: OfferingSeed[] = [
  {
    courseCode: 'COE64-335',
    academic_year: 2026,
    semester: 1,
    instructorEmails: [
      'instructor@wu.ac.th',
      'napat.ai@wu.ac.th',
      'somchai.engineer@wu.ac.th',
      'suda.science@wu.ac.th',
      'kanokwan.mgmt@wu.ac.th',
    ],
    studentCodes: [
      '66131319',
      '66250102',
      '66250103',
      '66250104',
      '66220501',
      '66220502',
    ],
  },
  {
    courseCode: 'COE64-361',
    academic_year: 2026,
    semester: 1,
    instructorEmails: [
      'napat.ai@wu.ac.th',
      'somchai.engineer@wu.ac.th',
      'instructor@wu.ac.th',
      'suda.science@wu.ac.th',
    ],
    studentCodes: ['66250102', '66250103', '66250104'],
  },
  {
    courseCode: 'COE64-371',
    academic_year: 2026,
    semester: 1,
    instructorEmails: [
      'instructor@wu.ac.th',
      'somchai.engineer@wu.ac.th',
      'napat.ai@wu.ac.th',
      'pornchai.liberal@wu.ac.th',
    ],
    studentCodes: ['66131319', '66220501', '66220502', '65220101'],
  },
  {
    courseCode: 'COE64-372',
    academic_year: 2026,
    semester: 2,
    instructorEmails: ['instructor@wu.ac.th', 'somchai.engineer@wu.ac.th'],
    studentCodes: ['66131319', '66220501', '66250102'],
  },
  {
    courseCode: 'COE64-305',
    academic_year: 2026,
    semester: 1,
    instructorEmails: ['suda.science@wu.ac.th'],
    studentCodes: [
      '64121201',
      '64121202',
      '66121212',
      '65250101',
      '66250102',
    ],
  },
  {
    courseCode: 'COE64-233',
    academic_year: 2025,
    semester: 2,
    instructorEmails: ['somchai.engineer@wu.ac.th'],
    studentCodes: ['65220101', '66220501', '66131319'],
  },
  {
    courseCode: 'COE64-325',
    academic_year: 2026,
    semester: 1,
    instructorEmails: [
      'somchai.engineer@wu.ac.th',
      'instructor@wu.ac.th',
      'napat.ai@wu.ac.th',
      'suda.science@wu.ac.th',
    ],
    studentCodes: ['66250102', '66250103', '65250101', '66131319'],
  },
  {
    courseCode: 'COE64-344',
    academic_year: 2026,
    semester: 1,
    instructorEmails: ['napat.ai@wu.ac.th'],
    studentCodes: ['66250102', '66220501', '66220502'],
  },
  {
    courseCode: 'COE64-367',
    academic_year: 2026,
    semester: 2,
    is_active: false,
    instructorEmails: ['napat.ai@wu.ac.th'],
    studentCodes: ['66250102', '66250103'],
  },
  {
    courseCode: 'GED65-130',
    academic_year: 2026,
    semester: 1,
    instructorEmails: [
      'kanokwan.mgmt@wu.ac.th',
      'pornchai.liberal@wu.ac.th',
      'instructor@wu.ac.th',
      'suda.science@wu.ac.th',
      'napat.ai@wu.ac.th',
    ],
    studentCodes: [
      '66131319',
      '66112233',
      '66170201',
      '66140101',
      '66110701',
      '63131101',
      '63131102',
    ],
  },
  {
    courseCode: 'STD-001',
    academic_year: 2026,
    semester: 1,
    instructorEmails: ['pornchai.liberal@wu.ac.th'],
    studentCodes: [
      '63131101',
      '63131102',
      '66131319',
      '66220501',
      '66112233',
      '66140101',
    ],
  },
  {
    courseCode: 'STD-002',
    academic_year: 2026,
    semester: 1,
    instructorEmails: ['instructor@wu.ac.th'],
    studentCodes: [
      '66131319',
      '66220501',
      '66220502',
      '66250102',
      '66250103',
      '66131320',
      '66131321',
    ],
  },
  {
    courseCode: 'STD-003',
    academic_year: 2026,
    semester: 1,
    instructorEmails: ['pornchai.liberal@wu.ac.th'],
    studentCodes: ['63131102', '66110701', '66131319', '66170201'],
  },
];

async function removeLegacyDemoCourse(): Promise<void> {
  const legacy = await prisma.courses.findFirst({
    where: { course_code: 'IAES101' },
  });
  if (legacy) {
    await prisma.courses.delete({ where: { courses_id: legacy.courses_id } });
    console.log('Removed legacy IAES101 demo course');
  }
}

async function upsertCourse(
  seed: CourseSeed,
  instructorId: bigint,
): Promise<courses> {
  const existing = await prisma.courses.findFirst({
    where: { course_code: seed.code },
  });
  if (existing) {
    return prisma.courses.update({
      where: { courses_id: existing.courses_id },
      data: {
        course_name: seed.name_en,
        course_name_th: seed.name_th,
        course_name_en: seed.name_en,
        description: seed.description,
        is_active: true,
      },
    });
  }
  return prisma.courses.create({
    data: {
      course_code: seed.code,
      course_name: seed.name_en,
      course_name_th: seed.name_th,
      course_name_en: seed.name_en,
      description: seed.description,
      created_by_instructors_id: instructorId,
      is_active: true,
    },
  });
}

async function upsertOffering(
  courseId: bigint,
  year: number,
  semester: number,
  isActive: boolean,
): Promise<course_offerings> {
  const existing = await prisma.course_offerings.findFirst({
    where: { courses_id: courseId, academic_year: year, semester },
  });
  if (existing) {
    return prisma.course_offerings.update({
      where: { course_offerings_id: existing.course_offerings_id },
      data: { is_active: isActive },
    });
  }
  return prisma.course_offerings.create({
    data: {
      courses_id: courseId,
      academic_year: year,
      semester,
      is_active: isActive,
    },
  });
}

export interface SeededCourses {
  courses: Map<string, courses>;
  offerings: Array<{
    courseCode: string;
    academic_year: number;
    semester: number;
    offering: course_offerings;
  }>;
}

export async function seedCourses(staff: SeededStaff): Promise<SeededCourses> {
  await removeLegacyDemoCourse();

  const primaryInstructor =
    staff.instructors.find((i) => i.email === 'instructor@wu.ac.th') ??
    staff.instructors[0];

  const emailToStaff = new Map<string, staff_users>(
    staff.all.map((s) => [s.email, s]),
  );

  const courseMap = new Map<string, courses>();
  for (const seed of COURSES) {
    const course = await upsertCourse(seed, primaryInstructor.staff_users_id);
    courseMap.set(seed.code, course);
  }

  const offerings: SeededCourses['offerings'] = [];

  for (const row of OFFERINGS) {
    const course = courseMap.get(row.courseCode);
    if (!course) continue;

    const offering = await upsertOffering(
      course.courses_id,
      row.academic_year,
      row.semester,
      row.is_active ?? true,
    );

    const instructorLinks = row.instructorEmails
      .map((email) => emailToStaff.get(email))
      .filter((s): s is staff_users => Boolean(s))
      .map((s) => ({
        course_offerings_id: offering.course_offerings_id,
        staff_users_id: s.staff_users_id,
      }));

    if (instructorLinks.length > 0) {
      await prisma.course_instructors.createMany({
        data: instructorLinks,
        skipDuplicates: true,
      });
    }

    if (row.studentCodes.length > 0) {
      await prisma.course_enrollments.createMany({
        data: row.studentCodes.map((code) => ({
          course_offerings_id: offering.course_offerings_id,
          student_code: code,
        })),
        skipDuplicates: true,
      });
    }

    offerings.push({
      courseCode: row.courseCode,
      academic_year: row.academic_year,
      semester: row.semester,
      offering,
    });
  }

  console.log(
    `Courses: ${courseMap.size} real courses, ${offerings.length} offerings`,
  );

  return { courses: courseMap, offerings };
}
