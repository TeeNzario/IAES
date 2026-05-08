import {
  question_bank,
  question_bank_years,
  question_collections,
} from '../../src/generated/prisma/client';
import { prisma } from '../../src/lib/prisma';
import { SeededCourses } from './courses';
import { SeededStaff } from './staff';

type QuestionSeed = {
  /** Stable external key so re-running the seed updates the same question. */
  externalKey: string;
  courseCode: string;
  collectionKey: string;
  question_type: 'MCQ_SINGLE' | 'MCQ_MULTI';
  question_text: string;
  difficulty_param: number;
  discrimination_param: number;
  guessing_param: number;
  knowledgeNames: string[];
  choices: Array<{ text: string; is_correct: boolean }>;
};

type CollectionSeed = {
  key: string;
  courseCode: string;
  academic_year: number;
  title: string;
  description?: string;
};

const COLLECTIONS: CollectionSeed[] = [
  {
    key: 'ML-2026-MID',
    courseCode: 'COE64-335',
    academic_year: 2026,
    title: 'กลางภาค',
    description: 'แบบทดสอบกลางภาค รายวิชา Machine Learning ปีการศึกษา 2026',
  },
  {
    key: 'ML-2026-FIN',
    courseCode: 'COE64-335',
    academic_year: 2026,
    title: 'ปลายภาค',
    description: 'แบบทดสอบปลายภาค รายวิชา Machine Learning ปีการศึกษา 2026',
  },
  {
    key: 'FE-2026-QUIZ',
    courseCode: 'COE64-371',
    academic_year: 2026,
    title: 'แบบทดสอบย่อย 1',
    description: 'ทดสอบความเข้าใจพื้นฐาน HTML/CSS/JavaScript',
  },
  {
    key: 'FE-2026-MID',
    courseCode: 'COE64-371',
    academic_year: 2026,
    title: 'กลางภาค',
    description: 'แบบทดสอบกลางภาค Front End Programming',
  },
  {
    key: 'BE-2026-MID',
    courseCode: 'COE64-372',
    academic_year: 2026,
    title: 'กลางภาค',
  },
  {
    key: 'NET-2026-MID',
    courseCode: 'COE64-325',
    academic_year: 2026,
    title: 'กลางภาค',
  },
  {
    key: 'DW-2026-MID',
    courseCode: 'COE64-344',
    academic_year: 2026,
    title: 'กลางภาค',
  },
  {
    key: 'VIZ-2026-MID',
    courseCode: 'COE64-367',
    academic_year: 2026,
    title: 'กลางภาค',
    description: 'Data Visualization — หลักการและการประยุกต์ใช้',
  },
  {
    key: 'STD-IT-MAIN',
    courseCode: 'STD-002',
    academic_year: 2026,
    title: 'ชุดมาตรฐาน',
    description: 'ชุดข้อสอบมาตรฐานด้านไอที',
  },
  {
    key: 'STD-EN-MAIN',
    courseCode: 'STD-001',
    academic_year: 2026,
    title: 'ชุดมาตรฐาน',
  },
];

const QUESTIONS: QuestionSeed[] = [
  // ============ Machine Learning midterm ============
  {
    externalKey: 'ML-MID-001',
    courseCode: 'COE64-335',
    collectionKey: 'ML-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text:
      'อัลกอริทึมใดต่อไปนี้จัดเป็นการเรียนรู้แบบมีผู้สอน (Supervised Learning)',
    difficulty_param: -1.2,
    discrimination_param: 1.0,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาเข้าใจพื้นฐานการเรียนรู้ของเครื่องและประเภทของอัลกอริทึม',
    ],
    choices: [
      { text: 'K-Means Clustering', is_correct: false },
      { text: 'Linear Regression', is_correct: true },
      { text: 'Principal Component Analysis', is_correct: false },
      { text: 'DBSCAN', is_correct: false },
    ],
  },
  {
    externalKey: 'ML-MID-002',
    courseCode: 'COE64-335',
    collectionKey: 'ML-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text:
      'เมตริกใดไม่เหมาะกับการประเมินโมเดลจำแนกประเภทที่ข้อมูลไม่สมดุล (imbalanced classes)',
    difficulty_param: 0.3,
    discrimination_param: 1.3,
    guessing_param: 0.2,
    knowledgeNames: [
      'นักศึกษาสามารถประเมินและเปรียบเทียบประสิทธิภาพของโมเดลด้วยเมตริกที่เหมาะสม',
    ],
    choices: [
      { text: 'Accuracy', is_correct: true },
      { text: 'F1-score', is_correct: false },
      { text: 'ROC-AUC', is_correct: false },
      { text: 'Precision-Recall AUC', is_correct: false },
    ],
  },
  {
    externalKey: 'ML-MID-003',
    courseCode: 'COE64-335',
    collectionKey: 'ML-2026-MID',
    question_type: 'MCQ_MULTI',
    question_text:
      'ข้อใดเป็นเทคนิคที่ใช้ลดปัญหา Overfitting (เลือกทุกข้อที่ถูก)',
    difficulty_param: 0.8,
    discrimination_param: 1.5,
    guessing_param: 0.1,
    knowledgeNames: [
      'นักศึกษาสามารถประยุกต์ใช้อัลกอริทึมการเรียนรู้แบบมีผู้สอนกับชุดข้อมูลจริง',
    ],
    choices: [
      { text: 'Regularization (L1/L2)', is_correct: true },
      { text: 'Cross-validation', is_correct: true },
      { text: 'เพิ่มพารามิเตอร์ของโมเดลให้มากที่สุด', is_correct: false },
      { text: 'Dropout', is_correct: true },
    ],
  },
  {
    externalKey: 'ML-MID-004',
    courseCode: 'COE64-335',
    collectionKey: 'ML-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text:
      'Bias-variance tradeoff หมายถึงสถานการณ์ใด',
    difficulty_param: 1.5,
    discrimination_param: 1.1,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาเข้าใจพื้นฐานการเรียนรู้ของเครื่องและประเภทของอัลกอริทึม',
    ],
    choices: [
      { text: 'ยิ่งลด bias มากเท่าใด variance จะลดลงตาม', is_correct: false },
      {
        text: 'การลด bias ของโมเดลมักทำให้ variance เพิ่มขึ้น และในทางกลับกัน',
        is_correct: true,
      },
      { text: 'bias และ variance ไม่เกี่ยวข้องกัน', is_correct: false },
      { text: 'โมเดลที่ดีต้องมี variance สูงเสมอ', is_correct: false },
    ],
  },
  {
    externalKey: 'ML-MID-005',
    courseCode: 'COE64-335',
    collectionKey: 'ML-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text: 'Decision Tree ใช้เมตริกใดในการเลือกตัวแปรที่ใช้แบ่ง node',
    difficulty_param: -0.5,
    discrimination_param: 0.9,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาสามารถประยุกต์ใช้อัลกอริทึมการเรียนรู้แบบมีผู้สอนกับชุดข้อมูลจริง',
    ],
    choices: [
      { text: 'Gini Impurity หรือ Information Gain', is_correct: true },
      { text: 'Mean Squared Error เท่านั้น', is_correct: false },
      { text: 'Cosine Similarity', is_correct: false },
      { text: 'Euclidean Distance', is_correct: false },
    ],
  },
  // ============ Machine Learning final ============
  {
    externalKey: 'ML-FIN-001',
    courseCode: 'COE64-335',
    collectionKey: 'ML-2026-FIN',
    question_type: 'MCQ_SINGLE',
    question_text:
      'Gradient Descent แบบใดที่อัปเดตน้ำหนักโมเดลโดยใช้ข้อมูลบางส่วน (batch) ในแต่ละรอบ',
    difficulty_param: 0.2,
    discrimination_param: 1.2,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาสามารถประยุกต์ใช้อัลกอริทึมการเรียนรู้แบบมีผู้สอนกับชุดข้อมูลจริง',
    ],
    choices: [
      { text: 'Batch Gradient Descent', is_correct: false },
      { text: 'Stochastic Gradient Descent', is_correct: false },
      { text: 'Mini-batch Gradient Descent', is_correct: true },
      { text: 'Normal Equation', is_correct: false },
    ],
  },
  {
    externalKey: 'ML-FIN-002',
    courseCode: 'COE64-335',
    collectionKey: 'ML-2026-FIN',
    question_type: 'MCQ_MULTI',
    question_text: 'เมตริกสำหรับปัญหา Regression ได้แก่ข้อใดบ้าง',
    difficulty_param: -0.2,
    discrimination_param: 1.0,
    guessing_param: 0.2,
    knowledgeNames: [
      'นักศึกษาสามารถประเมินและเปรียบเทียบประสิทธิภาพของโมเดลด้วยเมตริกที่เหมาะสม',
    ],
    choices: [
      { text: 'Mean Absolute Error (MAE)', is_correct: true },
      { text: 'Root Mean Squared Error (RMSE)', is_correct: true },
      { text: 'Coefficient of Determination (R²)', is_correct: true },
      { text: 'Log-loss (cross-entropy)', is_correct: false },
    ],
  },
  {
    externalKey: 'ML-FIN-003',
    courseCode: 'COE64-335',
    collectionKey: 'ML-2026-FIN',
    question_type: 'MCQ_SINGLE',
    question_text: 'Random Forest เป็นการประยุกต์ใช้แนวคิดใด',
    difficulty_param: 0.6,
    discrimination_param: 1.4,
    guessing_param: 0.2,
    knowledgeNames: [
      'นักศึกษาสามารถประยุกต์ใช้อัลกอริทึมการเรียนรู้แบบมีผู้สอนกับชุดข้อมูลจริง',
    ],
    choices: [
      { text: 'Boosting', is_correct: false },
      { text: 'Bagging ร่วมกับ Feature Randomness', is_correct: true },
      { text: 'Stacking', is_correct: false },
      { text: 'Gradient Boosting', is_correct: false },
    ],
  },
  // ============ CNN ============
  {
    externalKey: 'CNN-001',
    courseCode: 'COE64-361',
    collectionKey: 'ML-2026-FIN',
    question_type: 'MCQ_SINGLE',
    question_text: 'ข้อใดเป็นเหตุผลหลักที่ CNN เหมาะกับงานประมวลผลภาพ',
    difficulty_param: -0.3,
    discrimination_param: 1.1,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาเข้าใจสถาปัตยกรรมของโครงข่ายประสาทเทียมแบบคอนโวลูชันและการประมวลผลภาพ',
    ],
    choices: [
      {
        text: 'ใช้พารามิเตอร์น้อยกว่า Dense Layer และเก็บคุณลักษณะเชิงพื้นที่ได้',
        is_correct: true,
      },
      { text: 'ทำงานบน CPU ได้เท่านั้น', is_correct: false },
      { text: 'ไม่ต้องใช้ฟังก์ชันกระตุ้น (activation)', is_correct: false },
      { text: 'ต้องใช้กับข้อมูลลำดับเวลาเท่านั้น', is_correct: false },
    ],
  },
  // ============ Front End — Quiz ============
  {
    externalKey: 'FE-QUIZ-001',
    courseCode: 'COE64-371',
    collectionKey: 'FE-2026-QUIZ',
    question_type: 'MCQ_SINGLE',
    question_text: 'HTML แท็กใดใช้กำหนดรายการแบบเรียงลำดับ',
    difficulty_param: -2.0,
    discrimination_param: 0.7,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาเข้าใจหลักการออกแบบส่วนติดต่อผู้ใช้งานและการเขียนโปรแกรมบนฝั่งหน้าบ้านด้วยเฟรมเวิร์กสมัยใหม่',
    ],
    choices: [
      { text: '<ul>', is_correct: false },
      { text: '<ol>', is_correct: true },
      { text: '<dl>', is_correct: false },
      { text: '<list>', is_correct: false },
    ],
  },
  {
    externalKey: 'FE-QUIZ-002',
    courseCode: 'COE64-371',
    collectionKey: 'FE-2026-QUIZ',
    question_type: 'MCQ_SINGLE',
    question_text:
      'CSS คุณสมบัติใดใช้สำหรับจัดเรียงสมาชิกใน container แบบ flex',
    difficulty_param: -1.5,
    discrimination_param: 0.9,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาเข้าใจหลักการออกแบบส่วนติดต่อผู้ใช้งานและการเขียนโปรแกรมบนฝั่งหน้าบ้านด้วยเฟรมเวิร์กสมัยใหม่',
    ],
    choices: [
      { text: 'align-content', is_correct: false },
      { text: 'justify-content', is_correct: true },
      { text: 'align-items', is_correct: false },
      { text: 'flex-wrap', is_correct: false },
    ],
  },
  {
    externalKey: 'FE-QUIZ-003',
    courseCode: 'COE64-371',
    collectionKey: 'FE-2026-QUIZ',
    question_type: 'MCQ_SINGLE',
    question_text:
      'ใน JavaScript คำสั่งใดประกาศตัวแปรแบบบล็อกสโคปและไม่สามารถกำหนดค่าใหม่ได้',
    difficulty_param: -0.8,
    discrimination_param: 1.1,
    guessing_param: 0.2,
    knowledgeNames: [
      'นักศึกษาสามารถเขียนโปรแกรมด้วยภาษา JavaScript/TypeScript และจัดการสถานะของแอปพลิเคชันได้อย่างเหมาะสม',
    ],
    choices: [
      { text: 'var', is_correct: false },
      { text: 'let', is_correct: false },
      { text: 'const', is_correct: true },
      { text: 'static', is_correct: false },
    ],
  },
  {
    externalKey: 'FE-QUIZ-004',
    courseCode: 'COE64-371',
    collectionKey: 'FE-2026-QUIZ',
    question_type: 'MCQ_MULTI',
    question_text:
      'ข้อใดคือคุณสมบัติของ React Hook useState (เลือกทุกข้อที่ถูก)',
    difficulty_param: 0.4,
    discrimination_param: 1.3,
    guessing_param: 0.1,
    knowledgeNames: [
      'นักศึกษาเข้าใจหลักการออกแบบส่วนติดต่อผู้ใช้งานและการเขียนโปรแกรมบนฝั่งหน้าบ้านด้วยเฟรมเวิร์กสมัยใหม่',
    ],
    choices: [
      { text: 'คืนค่าเป็น tuple ของ [state, setState]', is_correct: true },
      {
        text: 'เรียกใช้ได้เฉพาะใน function component หรือ custom hook',
        is_correct: true,
      },
      { text: 'ใช้ได้ใน class component โดยตรง', is_correct: false },
      {
        text: 'เรียก setState แล้วจะ trigger การ re-render ของ component',
        is_correct: true,
      },
    ],
  },
  // ============ Front End — Midterm ============
  {
    externalKey: 'FE-MID-001',
    courseCode: 'COE64-371',
    collectionKey: 'FE-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text:
      'ในโครงสร้าง React เมื่อต้องการเรียก API เมื่อ component ถูก mount ครั้งแรก ควรใช้ Hook ใด',
    difficulty_param: 0.1,
    discrimination_param: 1.2,
    guessing_param: 0.2,
    knowledgeNames: [
      'นักศึกษาเข้าใจหลักการออกแบบส่วนติดต่อผู้ใช้งานและการเขียนโปรแกรมบนฝั่งหน้าบ้านด้วยเฟรมเวิร์กสมัยใหม่',
    ],
    choices: [
      { text: 'useState', is_correct: false },
      { text: 'useEffect ที่มี dependency เป็น []', is_correct: true },
      { text: 'useMemo', is_correct: false },
      { text: 'useContext', is_correct: false },
    ],
  },
  {
    externalKey: 'FE-MID-002',
    courseCode: 'COE64-371',
    collectionKey: 'FE-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text:
      'TypeScript utility type ใดที่ทำให้ทุก property ของ type กลายเป็น optional',
    difficulty_param: 0.7,
    discrimination_param: 1.4,
    guessing_param: 0.15,
    knowledgeNames: [
      'นักศึกษาสามารถเขียนโปรแกรมด้วยภาษา JavaScript/TypeScript และจัดการสถานะของแอปพลิเคชันได้อย่างเหมาะสม',
    ],
    choices: [
      { text: 'Readonly<T>', is_correct: false },
      { text: 'Required<T>', is_correct: false },
      { text: 'Partial<T>', is_correct: true },
      { text: 'Pick<T, K>', is_correct: false },
    ],
  },
  // ============ Back End ============
  {
    externalKey: 'BE-MID-001',
    courseCode: 'COE64-372',
    collectionKey: 'BE-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text: 'HTTP status code 201 หมายถึงอะไร',
    difficulty_param: -1.0,
    discrimination_param: 0.9,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาเข้าใจการออกแบบและพัฒนา REST API รวมถึงการรักษาความปลอดภัยของเซิร์ฟเวอร์',
    ],
    choices: [
      { text: 'OK — คำขอสำเร็จทั่วไป', is_correct: false },
      { text: 'Created — คำขอสำเร็จและมีการสร้างทรัพยากรใหม่', is_correct: true },
      { text: 'No Content', is_correct: false },
      { text: 'Accepted', is_correct: false },
    ],
  },
  {
    externalKey: 'BE-MID-002',
    courseCode: 'COE64-372',
    collectionKey: 'BE-2026-MID',
    question_type: 'MCQ_MULTI',
    question_text:
      'ข้อใดคือแนวปฏิบัติที่ดีในการออกแบบ REST API (เลือกทุกข้อที่ถูก)',
    difficulty_param: 0.3,
    discrimination_param: 1.3,
    guessing_param: 0.15,
    knowledgeNames: [
      'นักศึกษาเข้าใจการออกแบบและพัฒนา REST API รวมถึงการรักษาความปลอดภัยของเซิร์ฟเวอร์',
    ],
    choices: [
      { text: 'ใช้คำนาม (noun) เป็นชื่อ resource ใน URL', is_correct: true },
      { text: 'ใช้ HTTP verb สะท้อนการกระทำ (GET/POST/PUT/DELETE)', is_correct: true },
      {
        text: 'ส่งรหัสผ่านเป็น plaintext ผ่าน query string',
        is_correct: false,
      },
      {
        text: 'รองรับ versioning เมื่อต้องเปลี่ยน contract ของ API',
        is_correct: true,
      },
    ],
  },
  {
    externalKey: 'BE-MID-003',
    courseCode: 'COE64-372',
    collectionKey: 'BE-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text:
      'เพื่อป้องกัน SQL Injection แนวทางที่เหมาะสมที่สุดคือข้อใด',
    difficulty_param: 0.9,
    discrimination_param: 1.6,
    guessing_param: 0.1,
    knowledgeNames: [
      'นักศึกษาเข้าใจการออกแบบและพัฒนา REST API รวมถึงการรักษาความปลอดภัยของเซิร์ฟเวอร์',
    ],
    choices: [
      {
        text: 'ต่อสตริงของ query ด้วย input ของผู้ใช้โดยตรง',
        is_correct: false,
      },
      { text: 'ใช้ parameterized query หรือ ORM ที่ bind parameter', is_correct: true },
      { text: 'Validate รหัสผ่านด้วย regex เท่านั้น', is_correct: false },
      { text: 'ซ่อน error message โดยไม่ตรวจสอบ input', is_correct: false },
    ],
  },
  // ============ Network ============
  {
    externalKey: 'NET-MID-001',
    courseCode: 'COE64-325',
    collectionKey: 'NET-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text: 'OSI Model ชั้นใดรับผิดชอบการกำหนดเส้นทาง (routing)',
    difficulty_param: -0.4,
    discrimination_param: 1.1,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาเข้าใจโมเดลเครือข่าย OSI/TCP-IP และโปรโตคอลที่ใช้ในการสื่อสารข้อมูล',
    ],
    choices: [
      { text: 'Data Link (Layer 2)', is_correct: false },
      { text: 'Network (Layer 3)', is_correct: true },
      { text: 'Transport (Layer 4)', is_correct: false },
      { text: 'Session (Layer 5)', is_correct: false },
    ],
  },
  {
    externalKey: 'NET-MID-002',
    courseCode: 'COE64-325',
    collectionKey: 'NET-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text: 'โปรโตคอลใดใช้สำหรับแปลชื่อโดเมนเป็นหมายเลข IP',
    difficulty_param: -1.2,
    discrimination_param: 0.8,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาเข้าใจโมเดลเครือข่าย OSI/TCP-IP และโปรโตคอลที่ใช้ในการสื่อสารข้อมูล',
    ],
    choices: [
      { text: 'DHCP', is_correct: false },
      { text: 'DNS', is_correct: true },
      { text: 'FTP', is_correct: false },
      { text: 'SNMP', is_correct: false },
    ],
  },
  {
    externalKey: 'NET-MID-003',
    courseCode: 'COE64-325',
    collectionKey: 'NET-2026-MID',
    question_type: 'MCQ_MULTI',
    question_text:
      'ข้อใดเป็นความแตกต่างระหว่าง TCP และ UDP (เลือกทุกข้อที่ถูก)',
    difficulty_param: 0.5,
    discrimination_param: 1.4,
    guessing_param: 0.15,
    knowledgeNames: [
      'นักศึกษาสามารถวิเคราะห์และแก้ไขปัญหาเครือข่ายคอมพิวเตอร์เบื้องต้นได้',
    ],
    choices: [
      { text: 'TCP เป็น connection-oriented, UDP เป็น connectionless', is_correct: true },
      { text: 'TCP มีการตรวจสอบและส่งซ้ำเมื่อข้อมูลสูญหาย', is_correct: true },
      { text: 'UDP เร็วกว่า TCP เพราะมี overhead น้อยกว่า', is_correct: true },
      { text: 'UDP รับประกันลำดับของ packet เสมอ', is_correct: false },
    ],
  },
  // ============ Data warehouse ============
  {
    externalKey: 'DW-MID-001',
    courseCode: 'COE64-344',
    collectionKey: 'DW-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text:
      'โครงสร้างข้อมูลแบบ Star Schema ประกอบด้วยตารางใดเป็นหลัก',
    difficulty_param: -0.1,
    discrimination_param: 1.2,
    guessing_param: 0.2,
    knowledgeNames: [
      'นักศึกษาสามารถเชื่อมต่อและออกแบบฐานข้อมูลเชิงสัมพันธ์ได้อย่างมีประสิทธิภาพ',
    ],
    choices: [
      { text: 'ตาราง Fact และตาราง Dimension', is_correct: true },
      { text: 'ตาราง Staging และตาราง Lookup', is_correct: false },
      { text: 'ตาราง OLTP และตาราง OLAP', is_correct: false },
      { text: 'ตาราง Operational และ Audit', is_correct: false },
    ],
  },
  {
    externalKey: 'DW-MID-002',
    courseCode: 'COE64-344',
    collectionKey: 'DW-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text: 'ETL ย่อมาจากข้อใด',
    difficulty_param: -1.7,
    discrimination_param: 0.6,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาสามารถเชื่อมต่อและออกแบบฐานข้อมูลเชิงสัมพันธ์ได้อย่างมีประสิทธิภาพ',
    ],
    choices: [
      { text: 'Extract, Transform, Load', is_correct: true },
      { text: 'Export, Transfer, Lookup', is_correct: false },
      { text: 'Evaluate, Test, Learn', is_correct: false },
      { text: 'Extend, Train, Launch', is_correct: false },
    ],
  },
  // ============ Data Viz ============
  {
    externalKey: 'VIZ-MID-001',
    courseCode: 'COE64-367',
    collectionKey: 'VIZ-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text:
      'กราฟประเภทใดเหมาะที่สุดสำหรับแสดงสัดส่วนของข้อมูลแบบ categorical ที่มีหมวดหมู่ไม่เกิน 5 หมวด',
    difficulty_param: -0.6,
    discrimination_param: 0.9,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาเข้าใจหลักการออกแบบและเทคนิคในการสร้างภาพข้อมูล พื้นฐานการสื่อสารและการจัดวางเพื่อสร้างการนำเสนอข้อมูลที่มีประสิทธิภาพ',
    ],
    choices: [
      { text: 'Scatter plot', is_correct: false },
      { text: 'Pie chart หรือ Bar chart', is_correct: true },
      { text: 'Heatmap', is_correct: false },
      { text: 'Box plot', is_correct: false },
    ],
  },
  {
    externalKey: 'VIZ-MID-002',
    courseCode: 'COE64-367',
    collectionKey: 'VIZ-2026-MID',
    question_type: 'MCQ_MULTI',
    question_text:
      'หลักการออกแบบ Data Visualization ที่ดี ได้แก่ข้อใดบ้าง (เลือกทุกข้อที่ถูก)',
    difficulty_param: 0.2,
    discrimination_param: 1.3,
    guessing_param: 0.1,
    knowledgeNames: [
      'นักศึกษาได้ประยุกต์ใช้หลักการออกแบบและเทคนิคในการสร้างภาพข้อมูล พื้นฐานการสื่อสารและการจัดวางเพื่อสร้างการนำเสนอข้อมูลด้วยกรณีศึกษา',
      'นักศึกษาเข้าใจหลักการออกแบบและเทคนิคในการสร้างภาพข้อมูล พื้นฐานการสื่อสารและการจัดวางเพื่อสร้างการนำเสนอข้อมูลที่มีประสิทธิภาพ',
    ],
    choices: [
      {
        text: 'เลือก chart type ให้สอดคล้องกับข้อความที่ต้องการสื่อสาร',
        is_correct: true,
      },
      {
        text: 'ใช้สีเพื่อเน้นข้อมูลสำคัญและคงความสม่ำเสมอของ color encoding',
        is_correct: true,
      },
      {
        text: 'ใส่ข้อมูลให้เยอะที่สุดเท่าที่จะเป็นไปได้ในแต่ละภาพ',
        is_correct: false,
      },
      {
        text: 'ใส่ annotation เพื่อนำสายตาผู้ชมไปยังข้อมูลสำคัญ',
        is_correct: true,
      },
    ],
  },
  {
    externalKey: 'VIZ-MID-003',
    courseCode: 'COE64-367',
    collectionKey: 'VIZ-2026-MID',
    question_type: 'MCQ_SINGLE',
    question_text:
      'เครื่องมือใดเหมาะสำหรับการทำ interactive data visualization บนเว็บ',
    difficulty_param: -0.9,
    discrimination_param: 1.0,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาได้ฝึกปฏิบัติการใช้เครื่องมือในการสร้างภาพข้อมูล',
    ],
    choices: [
      { text: 'D3.js หรือ Plotly', is_correct: true },
      { text: 'Matplotlib (static)', is_correct: false },
      { text: 'Microsoft Excel เท่านั้น', is_correct: false },
      { text: 'Photoshop', is_correct: false },
    ],
  },
  // ============ Standard IT ============
  {
    externalKey: 'STD-IT-001',
    courseCode: 'STD-002',
    collectionKey: 'STD-IT-MAIN',
    question_type: 'MCQ_SINGLE',
    question_text: 'หน่วยความจำชนิดใดเป็นหน่วยความจำหลักของคอมพิวเตอร์',
    difficulty_param: -2.0,
    discrimination_param: 0.5,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษามีทักษะพื้นฐานด้านเทคโนโลยีสารสนเทศและสามารถใช้เครื่องมือดิจิทัลเพื่อการเรียนรู้ได้',
    ],
    choices: [
      { text: 'RAM', is_correct: true },
      { text: 'SSD', is_correct: false },
      { text: 'HDD', is_correct: false },
      { text: 'CD-ROM', is_correct: false },
    ],
  },
  {
    externalKey: 'STD-IT-002',
    courseCode: 'STD-002',
    collectionKey: 'STD-IT-MAIN',
    question_type: 'MCQ_SINGLE',
    question_text: '1 Kilobyte (KB) มีค่าเท่ากับกี่ bytes',
    difficulty_param: -1.4,
    discrimination_param: 0.8,
    guessing_param: 0.2,
    knowledgeNames: [
      'นักศึกษามีทักษะพื้นฐานด้านเทคโนโลยีสารสนเทศและสามารถใช้เครื่องมือดิจิทัลเพื่อการเรียนรู้ได้',
    ],
    choices: [
      { text: '100 bytes', is_correct: false },
      { text: '1,024 bytes (หรือ 1,000 ตามระบบ SI)', is_correct: true },
      { text: '10,000 bytes', is_correct: false },
      { text: '1,000,000 bytes', is_correct: false },
    ],
  },
  {
    externalKey: 'STD-IT-003',
    courseCode: 'STD-002',
    collectionKey: 'STD-IT-MAIN',
    question_type: 'MCQ_SINGLE',
    question_text: 'อีเมลควรแนบไฟล์ขนาดใหญ่โดยวิธีใดจึงจะเหมาะสมที่สุด',
    difficulty_param: -1.0,
    discrimination_param: 0.7,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษามีทักษะพื้นฐานด้านเทคโนโลยีสารสนเทศและสามารถใช้เครื่องมือดิจิทัลเพื่อการเรียนรู้ได้',
    ],
    choices: [
      { text: 'แนบไฟล์ขนาดใหญ่ไปกับอีเมลโดยตรง', is_correct: false },
      {
        text: 'อัปโหลดไฟล์ไปยังคลาวด์แล้วส่งลิงก์ให้ผู้รับ',
        is_correct: true,
      },
      { text: 'แปลงเป็นรูปภาพแล้วแนบหลายๆ ฉบับ', is_correct: false },
      { text: 'ย่อไฟล์ด้วยการลดคุณภาพจนอ่านไม่ออก', is_correct: false },
    ],
  },
  {
    externalKey: 'STD-IT-004',
    courseCode: 'STD-002',
    collectionKey: 'STD-IT-MAIN',
    question_type: 'MCQ_MULTI',
    question_text:
      'ข้อใดเป็นวิธีรักษาความปลอดภัยของบัญชีออนไลน์ (เลือกทุกข้อที่ถูก)',
    difficulty_param: -0.5,
    discrimination_param: 1.0,
    guessing_param: 0.1,
    knowledgeNames: [
      'นักศึกษามีทักษะพื้นฐานด้านเทคโนโลยีสารสนเทศและสามารถใช้เครื่องมือดิจิทัลเพื่อการเรียนรู้ได้',
    ],
    choices: [
      { text: 'ใช้รหัสผ่านที่ยาวและไม่ซ้ำกับบัญชีอื่น', is_correct: true },
      { text: 'เปิดใช้ Two-Factor Authentication (2FA)', is_correct: true },
      { text: 'แชร์รหัสผ่านกับเพื่อนเพื่อสำรอง', is_correct: false },
      { text: 'ไม่คลิกลิงก์จากอีเมลที่ไม่น่าเชื่อถือ', is_correct: true },
    ],
  },
  // ============ Standard English ============
  {
    externalKey: 'STD-EN-001',
    courseCode: 'STD-001',
    collectionKey: 'STD-EN-MAIN',
    question_type: 'MCQ_SINGLE',
    question_text:
      'Choose the correct sentence: "She _____ to school every day."',
    difficulty_param: -1.8,
    discrimination_param: 0.6,
    guessing_param: 0.25,
    knowledgeNames: [
      'นักศึกษาสามารถใช้คำศัพท์และโครงสร้างประโยคภาษาอังกฤษในบริบทการสื่อสารทั่วไปได้',
    ],
    choices: [
      { text: 'go', is_correct: false },
      { text: 'goes', is_correct: true },
      { text: 'going', is_correct: false },
      { text: 'gone', is_correct: false },
    ],
  },
  {
    externalKey: 'STD-EN-002',
    courseCode: 'STD-001',
    collectionKey: 'STD-EN-MAIN',
    question_type: 'MCQ_SINGLE',
    question_text:
      'Which word is the antonym of "generous"?',
    difficulty_param: 0.3,
    discrimination_param: 1.1,
    guessing_param: 0.2,
    knowledgeNames: [
      'นักศึกษาสามารถใช้คำศัพท์และโครงสร้างประโยคภาษาอังกฤษในบริบทการสื่อสารทั่วไปได้',
    ],
    choices: [
      { text: 'Kind', is_correct: false },
      { text: 'Stingy', is_correct: true },
      { text: 'Friendly', is_correct: false },
      { text: 'Wealthy', is_correct: false },
    ],
  },
  {
    externalKey: 'STD-EN-003',
    courseCode: 'STD-001',
    collectionKey: 'STD-EN-MAIN',
    question_type: 'MCQ_SINGLE',
    question_text:
      'Which sentence uses the present perfect tense correctly?',
    difficulty_param: 0.9,
    discrimination_param: 1.5,
    guessing_param: 0.15,
    knowledgeNames: [
      'นักศึกษาสามารถใช้คำศัพท์และโครงสร้างประโยคภาษาอังกฤษในบริบทการสื่อสารทั่วไปได้',
    ],
    choices: [
      { text: 'I have visited Japan last year.', is_correct: false },
      { text: 'I visited Japan last year.', is_correct: false },
      { text: 'I have visited Japan three times.', is_correct: true },
      { text: 'I am visiting Japan three times.', is_correct: false },
    ],
  },
];

export interface SeededQuestions {
  years: Map<string, question_bank_years>;
  collections: Map<string, question_collections>;
  questionsByCollection: Map<string, question_bank[]>;
  questionsByCourse: Map<string, question_bank[]>;
}

export async function seedQuestions(
  staff: SeededStaff,
  _offerings: SeededCourses['offerings'],
): Promise<SeededQuestions> {
  const creator =
    staff.instructors.find((i) => i.email === 'instructor@iaes.local') ??
    staff.instructors[0];

  const courses = await prisma.courses.findMany();
  const courseByCode = new Map(courses.map((c) => [c.course_code, c]));

  const years = new Map<string, question_bank_years>();
  for (const collection of COLLECTIONS) {
    const course = courseByCode.get(collection.courseCode);
    if (!course) continue;
    const yearKey = `${collection.courseCode}-${collection.academic_year}`;
    if (years.has(yearKey)) continue;

    const year = await prisma.question_bank_years.upsert({
      where: {
        courses_id_academic_year: {
          courses_id: course.courses_id,
          academic_year: collection.academic_year,
        },
      },
      update: { is_active: true },
      create: {
        courses_id: course.courses_id,
        academic_year: collection.academic_year,
        created_by_staff_id: creator.staff_users_id,
        is_active: true,
      },
    });
    years.set(yearKey, year);
  }

  const collections = new Map<string, question_collections>();
  for (const seed of COLLECTIONS) {
    const yearKey = `${seed.courseCode}-${seed.academic_year}`;
    const year = years.get(yearKey);
    if (!year) continue;

    const collection = await prisma.question_collections.upsert({
      where: {
        question_bank_year_id_title: {
          question_bank_year_id: year.question_bank_year_id,
          title: seed.title,
        },
      },
      update: {
        description: seed.description ?? null,
        is_active: true,
      },
      create: {
        question_bank_year_id: year.question_bank_year_id,
        title: seed.title,
        description: seed.description,
        created_by_staff_id: creator.staff_users_id,
        is_active: true,
      },
    });
    collections.set(seed.key, collection);
  }

  const knowledgeAll = await prisma.knowledge_categories.findMany();
  const knowledgeByName = new Map(knowledgeAll.map((k) => [k.name, k]));

  const questionsByCollection = new Map<string, question_bank[]>();
  const questionsByCourse = new Map<string, question_bank[]>();

  // Tag each seeded question with its external key so we stay idempotent.
  // We use the description slot of the text is NOT available, so instead we
  // look up an existing question by its question_text within the collection.
  for (const q of QUESTIONS) {
    const course = courseByCode.get(q.courseCode);
    const collection = collections.get(q.collectionKey);
    if (!course || !collection) continue;

    const existing = await prisma.question_bank.findFirst({
      where: {
        question_collection_id: collection.question_collection_id,
        question_text: q.question_text,
      },
    });

    let question: question_bank;
    if (existing) {
      question = await prisma.question_bank.update({
        where: { question_id: existing.question_id },
        data: {
          question_type: q.question_type,
          difficulty_param: q.difficulty_param,
          discrimination_param: q.discrimination_param,
          guessing_param: q.guessing_param,
          is_active: true,
        },
      });
      await prisma.question_choices.deleteMany({
        where: { question_id: question.question_id },
      });
    } else {
      question = await prisma.question_bank.create({
        data: {
          question_text: q.question_text,
          question_type: q.question_type,
          difficulty_param: q.difficulty_param,
          discrimination_param: q.discrimination_param,
          guessing_param: q.guessing_param,
          question_collection_id: collection.question_collection_id,
          created_by_staff_id: creator.staff_users_id,
          is_active: true,
        },
      });
    }

    await prisma.question_choices.createMany({
      data: q.choices.map((c, index) => ({
        question_id: question.question_id,
        choice_text: c.text,
        is_correct: c.is_correct,
        display_order: index + 1,
      })),
    });

    for (const name of q.knowledgeNames) {
      const category = knowledgeByName.get(name);
      if (!category) continue;
      await prisma.question_knowledge.upsert({
        where: {
          question_id_knowledge_category_id_courses_id: {
            question_id: question.question_id,
            knowledge_category_id: category.knowledge_category_id,
            courses_id: course.courses_id,
          },
        },
        update: {},
        create: {
          question_id: question.question_id,
          knowledge_category_id: category.knowledge_category_id,
          courses_id: course.courses_id,
        },
      });
    }

    const collBucket = questionsByCollection.get(q.collectionKey) ?? [];
    collBucket.push(question);
    questionsByCollection.set(q.collectionKey, collBucket);

    const courseBucket = questionsByCourse.get(q.courseCode) ?? [];
    courseBucket.push(question);
    questionsByCourse.set(q.courseCode, courseBucket);
  }

  console.log(
    `Questions: ${QUESTIONS.length} across ${collections.size} collections and ${years.size} year folders`,
  );

  return { years, collections, questionsByCollection, questionsByCourse };
}
