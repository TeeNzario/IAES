import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateStaffDto, StaffRole } from '../modules/staff/dto/create-staff.dto';
import { UpdateStaffDto } from '../modules/staff/dto/update-staff.dto';
import { CreateStudentDto } from '../modules/students/dto/create-student.dto';
import { UpdateStudentDto } from '../modules/students/dto/update-student.dto';
import { BulkEnrollStudentDto } from '../modules/course-offerings/dto/bulk-enroll-student.dto';

describe('Thai-only person name validation', () => {
  it('rejects non-Thai staff names', async () => {
    const createStaff = plainToInstance(CreateStaffDto, {
      email: 'teacher@example.com',
      password: 'password123',
      facultyCode: 18,
      first_name: 'John',
      last_name: 'Smith',
      role: StaffRole.INSTRUCTOR,
    });

    const updateStaff = plainToInstance(UpdateStaffDto, {
      first_name: 'Jane',
      last_name: 'Doe',
    });

    await expect(validate(createStaff)).resolves.not.toHaveLength(0);
    await expect(validate(updateStaff)).resolves.not.toHaveLength(0);
  });

  it('rejects non-Thai student names', async () => {
    const createStudent = plainToInstance(CreateStudentDto, {
      student_code: '66130001',
      email: '66130001@mail.wu.ac.th',
      facultyCode: 18,
      first_name: 'Alice',
      last_name: 'Brown',
    });

    const updateStudent = plainToInstance(UpdateStudentDto, {
      first_name: 'Bob',
      last_name: 'Taylor',
    });

    await expect(validate(createStudent)).resolves.not.toHaveLength(0);
    await expect(validate(updateStudent)).resolves.not.toHaveLength(0);
  });

  it('rejects non-Thai names in bulk course enrollment', async () => {
    const bulkEnroll = plainToInstance(BulkEnrollStudentDto, {
      students: [
        {
          student_code: '66130001',
          email: '66130001@mail.wu.ac.th',
          facultyCode: 18,
          first_name: 'Charlie',
          last_name: 'Wilson',
        },
      ],
    });

    await expect(validate(bulkEnroll)).resolves.not.toHaveLength(0);
  });

  it('rejects unsupported faculty and curriculum ids for staff users', async () => {
    const createStaff = plainToInstance(CreateStaffDto, {
      email: 'teacher@example.com',
      password: 'password123',
      facultyCode: 999,
      first_name: 'กิตติ',
      last_name: 'ใจดี',
      role: StaffRole.INSTRUCTOR,
      curriculumId: 'ABC999',
    });

    const updateStaff = plainToInstance(UpdateStaffDto, {
      facultyCode: 999,
      curriculumId: 'CUR999',
    });

    await expect(validate(createStaff)).resolves.not.toHaveLength(0);
    await expect(validate(updateStaff)).resolves.not.toHaveLength(0);
  });

  it('rejects unsupported faculty and curriculum ids for students', async () => {
    const createStudent = plainToInstance(CreateStudentDto, {
      student_code: '66130001',
      email: '66130001@mail.wu.ac.th',
      facultyCode: 999,
      first_name: 'สมชาย',
      last_name: 'รักเรียน',
      curriculumId: 'ABC999',
    });

    const updateStudent = plainToInstance(UpdateStudentDto, {
      facultyCode: 999,
      curriculumId: 'CUR999',
    });

    await expect(validate(createStudent)).resolves.not.toHaveLength(0);
    await expect(validate(updateStudent)).resolves.not.toHaveLength(0);
  });
});
