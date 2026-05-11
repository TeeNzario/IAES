import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCourseDto } from '../modules/courses/dto/create-course.dto';
import { CreateStaffDto, StaffRole } from '../modules/staff/dto/create-staff.dto';
import { CreateStudentDto } from '../modules/students/dto/create-student.dto';
import { CreateExamDto } from '../modules/course-exams/dto/create-exam.dto';
import {
  BulkCreateQuestionsDto,
  QuestionTypeDto,
} from '../modules/question-bank/dto/create-question.dto';
import { FIELD_LENGTHS } from './field-lengths';

const repeat = (length: number) => 'ก'.repeat(length);
const repeatAscii = (length: number) => 'a'.repeat(length);
const longValidEmail = `${repeatAscii(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.io`;
const overLimitEmail = `${repeatAscii(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(60)}.io`;

describe('field length validation', () => {
  it('accepts text fields at their configured database-safe limits', async () => {
    const course = plainToInstance(CreateCourseDto, {
      course_code: repeatAscii(FIELD_LENGTHS.courseCode),
      course_name_th: repeat(FIELD_LENGTHS.courseName),
      course_name_en: repeatAscii(FIELD_LENGTHS.courseName),
      knowledge_categories: [repeat(FIELD_LENGTHS.knowledgeCategoryName)],
    });

    const staff = plainToInstance(CreateStaffDto, {
      email: longValidEmail,
      password: 'password123',
      facultyCode: 18,
      title: repeat(FIELD_LENGTHS.title),
      first_name: repeat(FIELD_LENGTHS.firstName),
      last_name: repeat(FIELD_LENGTHS.lastName),
      role: StaffRole.INSTRUCTOR,
      curriculumId: repeatAscii(FIELD_LENGTHS.curriculumId),
    });

    const student = plainToInstance(CreateStudentDto, {
      student_code: '66130001',
      email: longValidEmail,
      password: 'password123',
      facultyCode: 18,
      title: repeat(FIELD_LENGTHS.title),
      first_name: repeat(FIELD_LENGTHS.firstName),
      last_name: repeat(FIELD_LENGTHS.lastName),
      curriculumId: repeatAscii(FIELD_LENGTHS.curriculumId),
    });

    const exam = plainToInstance(CreateExamDto, {
      title: repeat(FIELD_LENGTHS.examTitle),
      description: repeat(FIELD_LENGTHS.examDescription),
      start_time: '2026-05-12T09:00:00.000Z',
      end_time: '2026-05-12T11:00:00.000Z',
      question_ids: ['1'],
    });

    const questions = plainToInstance(BulkCreateQuestionsDto, {
      questions: [
        {
          question_text: repeat(FIELD_LENGTHS.questionText),
          question_type: QuestionTypeDto.MCQ_SINGLE,
          choices: [
            {
              choice_text: repeat(FIELD_LENGTHS.choiceText),
              is_correct: true,
              display_order: 0,
            },
            {
              choice_text: repeat(FIELD_LENGTHS.choiceText),
              is_correct: false,
              display_order: 1,
            },
          ],
          difficulty_param: 0,
          discrimination_param: 1,
          guessing_param: 0.25,
          knowledge_category_ids: ['1'],
        },
      ],
    });

    await expect(validate(course)).resolves.toHaveLength(0);
    await expect(validate(staff)).resolves.toHaveLength(0);
    await expect(validate(student)).resolves.toHaveLength(0);
    await expect(validate(exam)).resolves.toHaveLength(0);
    await expect(validate(questions)).resolves.toHaveLength(0);
  });

  it('rejects text fields that exceed configured limits', async () => {
    const course = plainToInstance(CreateCourseDto, {
      course_code: repeatAscii(FIELD_LENGTHS.courseCode + 1),
      course_name_th: repeat(FIELD_LENGTHS.courseName + 1),
      course_name_en: repeatAscii(FIELD_LENGTHS.courseName + 1),
      knowledge_categories: [repeat(FIELD_LENGTHS.knowledgeCategoryName + 1)],
    });

    const staff = plainToInstance(CreateStaffDto, {
      email: overLimitEmail,
      password: 'password123',
      facultyCode: 18,
      title: repeat(FIELD_LENGTHS.title + 1),
      first_name: repeat(FIELD_LENGTHS.firstName + 1),
      last_name: repeat(FIELD_LENGTHS.lastName + 1),
      role: StaffRole.INSTRUCTOR,
      curriculumId: repeatAscii(FIELD_LENGTHS.curriculumId + 1),
    });

    const student = plainToInstance(CreateStudentDto, {
      student_code: '66130001',
      email: overLimitEmail,
      password: 'password123',
      facultyCode: 18,
      title: repeat(FIELD_LENGTHS.title + 1),
      first_name: repeat(FIELD_LENGTHS.firstName + 1),
      last_name: repeat(FIELD_LENGTHS.lastName + 1),
      curriculumId: repeatAscii(FIELD_LENGTHS.curriculumId + 1),
    });

    const exam = plainToInstance(CreateExamDto, {
      title: repeat(FIELD_LENGTHS.examTitle + 1),
      description: repeat(FIELD_LENGTHS.examDescription + 1),
      start_time: '2026-05-12T09:00:00.000Z',
      end_time: '2026-05-12T11:00:00.000Z',
      question_ids: ['1'],
    });

    const questions = plainToInstance(BulkCreateQuestionsDto, {
      questions: [
        {
          question_text: repeat(FIELD_LENGTHS.questionText + 1),
          question_type: QuestionTypeDto.MCQ_SINGLE,
          choices: [
            {
              choice_text: repeat(FIELD_LENGTHS.choiceText + 1),
              is_correct: true,
              display_order: 0,
            },
            {
              choice_text: repeat(FIELD_LENGTHS.choiceText + 1),
              is_correct: false,
              display_order: 1,
            },
          ],
          difficulty_param: 0,
          discrimination_param: 1,
          guessing_param: 0.25,
          knowledge_category_ids: ['1'],
        },
      ],
    });

    await expect(validate(course)).resolves.not.toHaveLength(0);
    await expect(validate(staff)).resolves.not.toHaveLength(0);
    await expect(validate(student)).resolves.not.toHaveLength(0);
    await expect(validate(exam)).resolves.not.toHaveLength(0);
    await expect(validate(questions)).resolves.not.toHaveLength(0);
  });
});
