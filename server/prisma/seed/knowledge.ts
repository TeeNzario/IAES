import { knowledge_categories } from '../../src/generated/prisma/client';
import { prisma } from '../../src/lib/prisma';
import { SeededStaff } from './staff';

type KnowledgeSeed = {
  name: string;
  courseCodes: string[];
};

export const KNOWLEDGE_SEEDS: KnowledgeSeed[] = [
  {
    name: 'นักศึกษาเข้าใจความสำคัญของการสร้างภาพข้อมูล',
    courseCodes: ['COE64-367', 'COE64-344'],
  },
  {
    name: 'นักศึกษาเข้าใจหลักการออกแบบและเทคนิคในการสร้างภาพข้อมูล พื้นฐานการสื่อสารและการจัดวางเพื่อสร้างการนำเสนอข้อมูลที่มีประสิทธิภาพ',
    courseCodes: ['COE64-367', 'COE64-344'],
  },
  {
    name: 'นักศึกษาได้ฝึกปฏิบัติการใช้เครื่องมือในการสร้างภาพข้อมูล',
    courseCodes: ['COE64-367'],
  },
  {
    name: 'นักศึกษาได้ประยุกต์ใช้หลักการออกแบบและเทคนิคในการสร้างภาพข้อมูล พื้นฐานการสื่อสารและการจัดวางเพื่อสร้างการนำเสนอข้อมูลด้วยกรณีศึกษา',
    courseCodes: ['COE64-367'],
  },
  {
    name: 'นักศึกษาเข้าใจพื้นฐานการเรียนรู้ของเครื่องและประเภทของอัลกอริทึม',
    courseCodes: ['COE64-335'],
  },
  {
    name: 'นักศึกษาสามารถประยุกต์ใช้อัลกอริทึมการเรียนรู้แบบมีผู้สอนกับชุดข้อมูลจริง',
    courseCodes: ['COE64-335'],
  },
  {
    name: 'นักศึกษาสามารถประเมินและเปรียบเทียบประสิทธิภาพของโมเดลด้วยเมตริกที่เหมาะสม',
    courseCodes: ['COE64-335', 'COE64-361'],
  },
  {
    name: 'นักศึกษาเข้าใจสถาปัตยกรรมของโครงข่ายประสาทเทียมแบบคอนโวลูชันและการประมวลผลภาพ',
    courseCodes: ['COE64-361', 'COE64-335'],
  },
  {
    name: 'นักศึกษาเข้าใจหลักการออกแบบส่วนติดต่อผู้ใช้งานและการเขียนโปรแกรมบนฝั่งหน้าบ้านด้วยเฟรมเวิร์กสมัยใหม่',
    courseCodes: ['COE64-371'],
  },
  {
    name: 'นักศึกษาสามารถเขียนโปรแกรมด้วยภาษา JavaScript/TypeScript และจัดการสถานะของแอปพลิเคชันได้อย่างเหมาะสม',
    courseCodes: ['COE64-371'],
  },
  {
    name: 'นักศึกษาเข้าใจการออกแบบและพัฒนา REST API รวมถึงการรักษาความปลอดภัยของเซิร์ฟเวอร์',
    courseCodes: ['COE64-372'],
  },
  {
    name: 'นักศึกษาสามารถเชื่อมต่อและออกแบบฐานข้อมูลเชิงสัมพันธ์ได้อย่างมีประสิทธิภาพ',
    courseCodes: ['COE64-372', 'COE64-344'],
  },
  {
    name: 'นักศึกษาเข้าใจโมเดลเครือข่าย OSI/TCP-IP และโปรโตคอลที่ใช้ในการสื่อสารข้อมูล',
    courseCodes: ['COE64-325'],
  },
  {
    name: 'นักศึกษาสามารถวิเคราะห์และแก้ไขปัญหาเครือข่ายคอมพิวเตอร์เบื้องต้นได้',
    courseCodes: ['COE64-325'],
  },
  {
    name: 'นักศึกษาเข้าใจพื้นฐานของสัญญาณเชิงเวลาต่อเนื่องและเชิงเวลาไม่ต่อเนื่อง',
    courseCodes: ['COE64-305'],
  },
  {
    name: 'นักศึกษาสามารถออกแบบและพัฒนาแอปพลิเคชันบนอุปกรณ์เคลื่อนที่ได้อย่างเหมาะสมกับผู้ใช้',
    courseCodes: ['COE64-233'],
  },
  {
    name: 'นักศึกษาเข้าใจแนวคิดพื้นฐานทางสังคมวิทยาและการวิเคราะห์โครงสร้างทางสังคม',
    courseCodes: ['GED65-130'],
  },
  {
    name: 'นักศึกษาสามารถใช้คำศัพท์และโครงสร้างประโยคภาษาอังกฤษในบริบทการสื่อสารทั่วไปได้',
    courseCodes: ['STD-001'],
  },
  {
    name: 'นักศึกษาสามารถอ่าน เขียน และเข้าใจภาษาไทยในระดับที่ใช้ในการสื่อสารทางวิชาการได้',
    courseCodes: ['STD-003'],
  },
  {
    name: 'นักศึกษามีทักษะพื้นฐานด้านเทคโนโลยีสารสนเทศและสามารถใช้เครื่องมือดิจิทัลเพื่อการเรียนรู้ได้',
    courseCodes: ['STD-002'],
  },
  // --- New knowledge categories for expanded courses ---
  {
    name: 'นักศึกษาเข้าใจหลักการแปรรูปอาหารและการถนอมอาหาร',
    courseCodes: ['AGT64-101'],
  },
  {
    name: 'นักศึกษาสามารถระบุและอธิบายมาตรฐานความปลอดภัยทางอาหารได้',
    courseCodes: ['AGT64-101'],
  },
  {
    name: 'นักศึกษาเข้าใจหลักกฎหมายพื้นฐานเกี่ยวกับสัญญาและละเมิด',
    courseCodes: ['LAW64-101'],
  },
  {
    name: 'นักศึกษาสามารถวิเคราะห์ปัญหากฎหมายธุรกิจเบื้องต้นได้',
    courseCodes: ['LAW64-101'],
  },
  {
    name: 'นักศึกษาเข้าใจโครงสร้างและหน้าที่ของระบบอวัยวะในร่างกายมนุษย์',
    courseCodes: ['MED64-201'],
  },
  {
    name: 'นักศึกษาสามารถอธิบายกระบวนการทำงานร่วมกันของระบบต่างๆ ในร่างกายได้',
    courseCodes: ['MED64-201'],
  },
  {
    name: 'นักศึกษาเข้าใจหลักการส่งเสริมสุขภาพและการป้องกันโรคในชุมชน',
    courseCodes: ['PHE64-101'],
  },
  {
    name: 'นักศึกษาสามารถวางแผนและประเมินโครงการสุขภาพชุมชนได้',
    courseCodes: ['PHE64-101'],
  },
  {
    name: 'นักศึกษาเข้าใจทฤษฎีพัฒนาการทางสติปัญญาและสังคมของมนุษย์',
    courseCodes: ['EDU64-201'],
  },
  {
    name: 'นักศึกษาสามารถประยุกต์ใช้จิตวิทยาการเรียนรู้ในการออกแบบการสอนได้',
    courseCodes: ['EDU64-201'],
  },
  {
    name: 'นักศึกษาเข้าใจหลักการจัดองค์ประกอบทางสถาปัตยกรรมและรูปแบบอาคาร',
    courseCodes: ['ARC64-101'],
  },
  {
    name: 'นักศึกษาสามารถเขียนแบบเบื้องต้นและใช้เครื่องมือออกแบบทางสถาปัตยกรรมได้',
    courseCodes: ['ARC64-101'],
  },
];

export interface SeededKnowledge {
  byCourseCode: Map<string, knowledge_categories[]>;
  all: knowledge_categories[];
}

export async function seedKnowledge(
  staff: SeededStaff,
): Promise<SeededKnowledge> {
  const creator =
    staff.instructors.find((i) => i.email === 'instructor@wu.ac.th') ??
    staff.instructors[0];

  const courses = await prisma.courses.findMany();
  const courseByCode = new Map(courses.map((c) => [c.course_code, c]));

  const byCourseCode = new Map<string, knowledge_categories[]>();
  const all: knowledge_categories[] = [];

  for (const seed of KNOWLEDGE_SEEDS) {
    const existing = await prisma.knowledge_categories.findFirst({
      where: { name: seed.name },
    });

    const category =
      existing ??
      (await prisma.knowledge_categories.create({
        data: {
          name: seed.name,
          created_by_staff_id: creator.staff_users_id,
        },
      }));

    all.push(category);

    for (const code of seed.courseCodes) {
      const course = courseByCode.get(code);
      if (!course) continue;

      await prisma.course_knowledge.upsert({
        where: {
          courses_id_knowledge_category_id: {
            courses_id: course.courses_id,
            knowledge_category_id: category.knowledge_category_id,
          },
        },
        create: {
          courses_id: course.courses_id,
          knowledge_category_id: category.knowledge_category_id,
        },
        update: {},
      });

      const bucket = byCourseCode.get(code) ?? [];
      bucket.push(category);
      byCourseCode.set(code, bucket);
    }
  }

  console.log(
    `Knowledge categories: ${all.length} (mapped across ${byCourseCode.size} courses)`,
  );

  return { byCourseCode, all };
}
