import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import {
  DEFAULT_FACULTY_CODE,
  DEFAULT_TITLE,
} from 'src/lib/academic-defaults';
import { FACULTY_MAP } from 'src/lib/faculty-map';
import {
  CreatePreviewSessionDto,
  EditPreviewRowDto,
  PreviewRowResponse,
  PreviewRowStatus,
  PreviewSessionResponse,
  ConfirmResponse,
  ConfirmResult,
} from './dto/preview-import.dto';
import { hashPassword } from '../../lib/password';
import { AuditActor, AuditService } from '../audit/audit.service';
import { FIELD_LENGTHS, maxLengthMessage } from 'src/lib/field-lengths';

const THAI_NAME_REGEX = /^[ก-๙\s]+$/;
const STUDENT_CODE_REGEX = /^\d{8}$/;
const EMAIL_DOMAIN = '@mail.wu.ac.th';
const PASSWORD_MIN_LENGTH = 8;
const CANONICAL_CURRICULUM_ID_REGEX = /^CUR(00[1-9]|0[1-6][0-9])$/;
const VALID_FACULTY_CODES = new Set(Object.keys(FACULTY_MAP).map(Number));

function previewStorageValue(value: string, max: number) {
  return value.length > max ? value.slice(0, max) : value;
}

@Injectable()
export class PreviewImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertInstructorForOffering(
    offeringId: bigint,
    staffUserId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const link = await client.course_instructors.findFirst({
      where: {
        course_offerings_id: offeringId,
        staff_users_id: BigInt(staffUserId),
      },
      select: { staff_users_id: true },
    });

    if (!link) {
      throw new ForbiddenException('You are not assigned to this offering.');
    }
  }

  private async assertSessionBelongsToOffering(
    sessionId: string,
    offeringId: bigint,
  ) {
    const session = await this.prisma.import_preview_sessions.findUnique({
      where: { id: sessionId },
      select: { course_offerings_id: true, expires_at: true },
    });

    if (!session) {
      throw new NotFoundException('Preview session not found');
    }

    if (session.course_offerings_id !== offeringId) {
      throw new BadRequestException('Session does not belong to this offering');
    }

    if (new Date() > session.expires_at) {
      throw new BadRequestException('Preview session has expired');
    }
  }

  /**
   * Create a preview session from CSV data
   */
  async createPreviewSession(
    offeringId: string,
    createdBy: string,
    dto: CreatePreviewSessionDto,
  ): Promise<PreviewSessionResponse> {
    const offeringBigInt = BigInt(offeringId);

    // Session expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Create session and rows in transaction
    const session = await this.prisma.$transaction(async (tx) => {
      await this.assertInstructorForOffering(offeringBigInt, createdBy, tx);

      const newSession = await tx.import_preview_sessions.create({
        data: {
          course_offerings_id: offeringBigInt,
          created_by: BigInt(createdBy),
          expires_at: expiresAt,
        },
      });

      // Validate and create rows
      const rowsData = await Promise.all(
        dto.rows.map(async (row, index) => {
          const facultyCodeNum = (() => {
            if (row.facultyCode == null || row.facultyCode === '')
              return undefined;
            const n = Number(row.facultyCode);
            return Number.isInteger(n) ? n : undefined;
          })();
          const studentCode = String(row.student_code ?? '').trim();
          const email = String(row.email ?? '').trim();
          const password = String(row.password ?? '').trim();
          const passwordHash =
            password.length >= PASSWORD_MIN_LENGTH
              ? await hashPassword(password)
              : null;
          const title = String(row.title ?? '').trim();
          const curriculumId = String(row.curriculumId ?? '').trim();
          const firstName = String(row.first_name ?? '').trim();
          const lastName = String(row.last_name ?? '').trim();

          const { status, note } = await this.validateRow(
            tx,
            offeringBigInt,
            studentCode,
            email,
            facultyCodeNum,
            password,
            passwordHash,
            title,
            curriculumId,
            firstName,
            lastName,
          );

          return {
            session_id: newSession.id,
            row_index: index,
            student_code: studentCode,
            email,
            password_hash: passwordHash,
            facultyCode: facultyCodeNum,
            title: previewStorageValue(title, FIELD_LENGTHS.title),
            curriculumId: previewStorageValue(
              curriculumId,
              FIELD_LENGTHS.curriculumId,
            ),
            first_name: firstName,
            last_name: lastName,
            status,
            note,
          };
        }),
      );

      await tx.import_preview_rows.createMany({ data: rowsData });

      return newSession;
    });

    // Fetch the complete session with rows
    return this.getSessionResponse(session.id, offeringBigInt);
  }

  /**
   * Edit a preview row and revalidate its status
   */
  async editPreviewRow(
    offeringId: string,
    sessionId: string,
    rowIndex: number,
    dto: EditPreviewRowDto,
    staffUserId: string,
  ): Promise<PreviewRowResponse> {
    const offeringBigInt = BigInt(offeringId);

    await this.assertInstructorForOffering(offeringBigInt, staffUserId);

    // Get existing row
    const row = await this.prisma.import_preview_rows.findUnique({
      where: {
        session_id_row_index: { session_id: sessionId, row_index: rowIndex },
      },
      include: { session: true },
    });

    if (!row) {
      throw new NotFoundException('Preview row not found');
    }

    // Verify session belongs to this offering
    if (row.session.course_offerings_id !== offeringBigInt) {
      throw new BadRequestException('Session does not belong to this offering');
    }

    // Check session not expired
    if (new Date() > row.session.expires_at) {
      throw new BadRequestException('Preview session has expired');
    }

    const editedPassword =
      dto.password == null ? undefined : String(dto.password).trim();
    const nextPasswordHash =
      editedPassword && editedPassword.length >= PASSWORD_MIN_LENGTH
        ? await hashPassword(editedPassword)
        : row.password_hash;

    // Merge edits
    const updatedData = {
      student_code: String(dto.student_code ?? row.student_code).trim(),
      email: String(dto.email ?? row.email).trim(),
      password_hash: nextPasswordHash,
      facultyCode: dto.facultyCode ?? row.facultyCode,
      title: String(dto.title ?? row.title ?? '').trim(),
      curriculumId: String(dto.curriculumId ?? row.curriculumId ?? '').trim(),
      first_name: String(dto.first_name ?? row.first_name ?? '').trim(),
      last_name: String(dto.last_name ?? row.last_name ?? '').trim(),
    };

    // Revalidate with new data
    const { status, note } = await this.validateRow(
      this.prisma,
      offeringBigInt,
      updatedData.student_code,
      updatedData.email,
      updatedData.facultyCode ?? undefined,
      editedPassword,
      updatedData.password_hash,
      updatedData.title,
      updatedData.curriculumId,
      updatedData.first_name,
      updatedData.last_name,
    );

    // Update row
    const updated = await this.prisma.import_preview_rows.update({
      where: {
        session_id_row_index: { session_id: sessionId, row_index: rowIndex },
      },
      data: {
        ...updatedData,
        title: previewStorageValue(updatedData.title, FIELD_LENGTHS.title),
        curriculumId: previewStorageValue(
          updatedData.curriculumId,
          FIELD_LENGTHS.curriculumId,
        ),
        status,
        note: note ?? null,
        updated_at: new Date(),
      },
    });

    return this.formatRow(updated);
  }

  /**
   * Delete a preview row (soft delete)
   */
  async deletePreviewRow(
    offeringId: string,
    sessionId: string,
    rowIndex: number,
    staffUserId: string,
  ): Promise<void> {
    const offeringBigInt = BigInt(offeringId);

    await this.assertInstructorForOffering(offeringBigInt, staffUserId);
    await this.assertSessionBelongsToOffering(sessionId, offeringBigInt);

    await this.prisma.import_preview_rows.update({
      where: {
        session_id_row_index: { session_id: sessionId, row_index: rowIndex },
      },
      data: { is_deleted: true },
    });
  }

  /**
   * Get a preview session with all its rows
   */
  async getPreviewSession(
    offeringId: string,
    sessionId: string,
    staffUserId: string,
  ): Promise<PreviewSessionResponse> {
    const offeringBigInt = BigInt(offeringId);

    await this.assertInstructorForOffering(offeringBigInt, staffUserId);
    await this.assertSessionBelongsToOffering(sessionId, offeringBigInt);

    return this.getSessionResponse(sessionId, offeringBigInt);
  }

  /**
   * Confirm a preview session and enroll students
   */
  async confirmSession(
    offeringId: string,
    sessionId: string,
    staffUserId: string,
    actor?: AuditActor,
  ): Promise<ConfirmResponse> {
    const offeringBigInt = BigInt(offeringId);

    await this.assertInstructorForOffering(offeringBigInt, staffUserId);

    const session = await this.prisma.import_preview_sessions.findUnique({
      where: { id: sessionId },
      include: {
        rows: {
          where: { is_deleted: false },
          orderBy: { row_index: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Preview session not found');
    }

    if (session.course_offerings_id !== offeringBigInt) {
      throw new BadRequestException('Session does not belong to this offering');
    }

    if (new Date() > session.expires_at) {
      throw new BadRequestException('Preview session has expired');
    }

    const results: ConfirmResult[] = [];

    for (const row of session.rows) {
      // Skip rows with missing data
      if (row.status === 'MISSING') {
        results.push({
          student_code: row.student_code,
          email: row.email,
          status: 'skipped',
          has_password: Boolean(row.password_hash),
          note: 'ข้อมูลที่จำเป็นไม่ครบ',
        });
        continue;
      }

      // Skip rows with duplicate identity conflicts
      if (row.status === 'DUPLICATE_IDENTITY') {
        results.push({
          student_code: row.student_code,
          email: row.email,
          status: 'skipped',
          has_password: Boolean(row.password_hash),
          note: row.note || 'ข้อมูลซ้ำ/ขัดแย้ง',
        });
        continue;
      }

      // Skip already enrolled
      if (row.status === 'ALREADY_ENROLLED') {
        results.push({
          student_code: row.student_code,
          email: row.email,
          status: 'already_enrolled',
          has_password: Boolean(row.password_hash),
        });
        continue;
      }

      if (!VALID_FACULTY_CODES.has(Number(row.facultyCode))) {
        results.push({
          student_code: row.student_code,
          email: row.email,
          status: 'skipped',
          has_password: Boolean(row.password_hash),
          note: 'รหัสสำนักวิชาไม่ถูกต้อง กรุณาแก้ไขแถวก่อนยืนยันการนำเข้า',
        });
        continue;
      }

      const curriculumId = row.curriculumId ?? '';
      if (!CANONICAL_CURRICULUM_ID_REGEX.test(curriculumId)) {
        results.push({
          student_code: row.student_code,
          email: row.email,
          status: 'skipped',
          has_password: Boolean(row.password_hash),
          note: 'รหัสหลักสูตรไม่ถูกต้อง กรุณาแก้ไขแถวก่อนยืนยันการนำเข้า',
        });
        continue;
      }

      try {
        await this.prisma.$transaction(async (tx) => {
          // Step 0: Check email conflict — reject if email belongs to a different student
          const emailOwner = await tx.students.findUnique({
            where: { email: row.email },
            select: { student_code: true },
          });
          if (emailOwner && emailOwner.student_code !== row.student_code) {
            throw new Error(
              `อีเมลนี้ถูกใช้โดยนักศึกษารหัส ${emailOwner.student_code} แล้ว`,
            );
          }

          // Step 0b: Look up existing student to detect email change (for directory cleanup)
          const existingStudent = await tx.students.findUnique({
            where: { student_code: row.student_code },
            select: { email: true },
          });

          const passwordHash = row.password_hash;
          if (!existingStudent && !passwordHash) {
            throw new BadRequestException(
              'จำเป็นต้องระบุรหัสผ่านสำหรับนักศึกษาที่ยังไม่มีบัญชีในระบบ',
            );
          }

          // Step 1: Upsert student_directory for the new email
          await tx.student_directory.upsert({
            where: { email: row.email },
            update: {
              student_code: row.student_code,
              first_name: row.first_name,
              last_name: row.last_name,
            },
            create: {
              student_code: row.student_code,
              email: row.email,
              first_name: row.first_name,
              last_name: row.last_name,
            },
          });

          // Step 1b: Clean up old student_directory entry when email changed
          if (existingStudent && existingStudent.email !== row.email) {
            await tx.student_directory.deleteMany({
              where: { email: existingStudent.email },
            });
          }

          // Step 2: Upsert students table
          await tx.students.upsert({
            where: { student_code: row.student_code },
            update: {
              email: row.email,
              ...(row.first_name != null && { first_name: row.first_name }),
              ...(row.last_name != null && { last_name: row.last_name }),
              ...(row.facultyCode != null && { facultyCode: row.facultyCode }),
              title: row.title || DEFAULT_TITLE,
              curriculumId,
            },
            create: {
              student_code: row.student_code,
              email: row.email,
              password_hash: passwordHash!,
              facultyCode: row.facultyCode ?? DEFAULT_FACULTY_CODE,
              title: row.title || DEFAULT_TITLE,
              curriculumId,
              first_name: row.first_name ?? '',
              last_name: row.last_name ?? '',
            },
          });

          // Step 3: Enroll (check first to be idempotent)
          const existing = await tx.course_enrollments.findUnique({
            where: {
              course_offerings_id_student_code: {
                course_offerings_id: offeringBigInt,
                student_code: row.student_code,
              },
            },
          });

          if (!existing) {
            await tx.course_enrollments.create({
              data: {
                course_offerings_id: offeringBigInt,
                student_code: row.student_code,
              },
            });
          }
        });

        results.push({
          student_code: row.student_code,
          email: row.email,
          status: 'enrolled',
          has_password: Boolean(row.password_hash),
        });
      } catch (error) {
        results.push({
          student_code: row.student_code,
          email: row.email,
          status: 'failed',
          has_password: Boolean(row.password_hash),
          note:
            error instanceof Error
              ? error.message
              : 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ',
        });
      }
    }

    // Delete the session after confirm
    await this.prisma.import_preview_sessions.delete({
      where: { id: sessionId },
    });

    const response = {
      results,
      summary: {
        total: results.length,
        enrolled: results.filter((r) => r.status === 'enrolled').length,
        alreadyEnrolled: results.filter((r) => r.status === 'already_enrolled')
          .length,
        failed: results.filter((r) => r.status === 'failed').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
      },
    };

    await this.audit.record({
      actor,
      action: 'course_offering.import_confirmed',
      entityType: 'course_offering',
      entityId: offeringId,
      metadata: {
        sessionId,
        ...response.summary,
      },
    });

    return response;
  }

  /**
   * Validate a row against student_directory, students, and course_enrollments
   */
  private async validateRow(
    tx: any, // Prisma transaction or client
    offeringId: bigint,
    studentCode: string,
    email: string,
    facultyCode: number | string | undefined,
    password: string | undefined,
    passwordHash: string | null | undefined,
    title: string,
    curriculumId: string,
    firstName: string,
    lastName: string,
  ): Promise<{ status: PreviewRowStatus; note?: string }> {
    // 1. Check required fields
    if (!studentCode || !email || !firstName || !lastName) {
      return { status: 'MISSING', note: 'ข้อมูลที่จำเป็นไม่ครบ' };
    }

    // 1a. Validate student_code: exactly 8 digits
    if (!STUDENT_CODE_REGEX.test(studentCode)) {
      return {
        status: 'MISSING',
        note: 'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลักเท่านั้น',
      };
    }

    // 1b. Validate email domain: @mail.wu.ac.th only
    if (email.length > FIELD_LENGTHS.email) {
      return {
        status: 'MISSING',
        note: maxLengthMessage('อีเมล', FIELD_LENGTHS.email),
      };
    }

    if (
      !email.endsWith(EMAIL_DOMAIN) ||
      email.split('@').length !== 2 ||
      !email.split('@')[0]
    ) {
      return {
        status: 'MISSING',
        note: 'อีเมลต้องเป็น @mail.wu.ac.th เท่านั้น',
      };
    }

    if (!title) {
      return { status: 'MISSING', note: 'จำเป็นต้องระบุคำนำหน้า' };
    }

    if (title.length > FIELD_LENGTHS.title) {
      return {
        status: 'MISSING',
        note: maxLengthMessage('คำนำหน้า', FIELD_LENGTHS.title),
      };
    }

    if (!curriculumId) {
      return { status: 'MISSING', note: 'จำเป็นต้องระบุหลักสูตร' };
    }

    if (curriculumId.length > FIELD_LENGTHS.curriculumId) {
      return {
        status: 'MISSING',
        note: maxLengthMessage('รหัสหลักสูตร', FIELD_LENGTHS.curriculumId),
      };
    }

    if (!CANONICAL_CURRICULUM_ID_REGEX.test(curriculumId)) {
      return {
        status: 'MISSING',
        note: 'รหัสหลักสูตรไม่ถูกต้อง กรุณาใช้รหัส CUR001-CUR069',
      };
    }

    if (firstName.length > FIELD_LENGTHS.firstName) {
      return {
        status: 'MISSING',
        note: maxLengthMessage('ชื่อ', FIELD_LENGTHS.firstName),
      };
    }

    if (lastName.length > FIELD_LENGTHS.lastName) {
      return {
        status: 'MISSING',
        note: maxLengthMessage('นามสกุล', FIELD_LENGTHS.lastName),
      };
    }

    if (!THAI_NAME_REGEX.test(firstName) || !THAI_NAME_REGEX.test(lastName)) {
      return { status: 'MISSING', note: 'ชื่อและนามสกุลต้องเป็นภาษาไทย' };
    }

    // 2. Check required facultyCode
    if (
      facultyCode == null ||
      isNaN(Number(facultyCode)) ||
      !Number.isInteger(Number(facultyCode))
    ) {
      return {
        status: 'MISSING',
        note: 'จำเป็นต้องระบุรหัสสำนักวิชาเป็นจำนวนเต็มที่ถูกต้อง',
      };
    }

    if (!VALID_FACULTY_CODES.has(Number(facultyCode))) {
      return {
        status: 'MISSING',
        note: 'รหัสสำนักวิชาไม่ถูกต้อง กรุณาใช้รหัส 1-18',
      };
    }

    // 2. Check if already enrolled in this offering
    const enrollment = await tx.course_enrollments.findUnique({
      where: {
        course_offerings_id_student_code: {
          course_offerings_id: offeringId,
          student_code: studentCode,
        },
      },
    });

    if (enrollment) {
      return { status: 'ALREADY_ENROLLED' };
    }

    const providedPassword = String(password ?? '').trim();
    if (providedPassword && providedPassword.length < PASSWORD_MIN_LENGTH) {
      return {
        status: 'MISSING',
        note: `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`,
      };
    }

    // 3. Check students and student_directory for identity conflicts
    const student = await tx.students.findUnique({
      where: { student_code: studentCode },
    });

    const directoryByCode = await tx.student_directory.findFirst({
      where: { student_code: studentCode },
    });

    const directoryByEmail = await tx.student_directory.findFirst({
      where: { email: email },
    });

    // Check for conflicts
    if (directoryByCode && directoryByEmail) {
      // Both found - check if they're the same record
      if (
        directoryByCode.student_directory_id !==
        directoryByEmail.student_directory_id
      ) {
        return {
          status: 'DUPLICATE_IDENTITY',
          note: `รหัสนักศึกษาตรงกับ ${directoryByCode.email} แต่อีเมลตรงกับ ${directoryByEmail.student_code}`,
        };
      }
      // Same record - check if name matches
      if (
        directoryByCode.first_name !== firstName ||
        directoryByCode.last_name !== lastName
      ) {
        if (!student && !passwordHash) {
          return {
            status: 'MISSING',
            note: 'จำเป็นต้องระบุรหัสผ่านสำหรับนักศึกษาที่ยังไม่มีบัญชีในระบบ',
          };
        }

        return {
          status: 'EXISTS_NOT_ENROLLED',
          note: `ชื่อ-นามสกุลไม่ตรงกับข้อมูลเดิม: ${directoryByCode.first_name} ${directoryByCode.last_name}`,
        };
      }

      if (!student && !passwordHash) {
        return {
          status: 'MISSING',
          note: 'จำเป็นต้องระบุรหัสผ่านสำหรับนักศึกษาที่ยังไม่มีบัญชีในระบบ',
        };
      }

      return { status: 'EXISTS_NOT_ENROLLED' };
    }

    if (directoryByCode) {
      // Code matches but email doesn't
      if (directoryByCode.email !== email) {
        return {
          status: 'DUPLICATE_IDENTITY',
          note: `รหัสนักศึกษานี้มีอยู่แล้วด้วยอีเมลอื่น: ${directoryByCode.email}`,
        };
      }
    }

    if (directoryByEmail) {
      // Email matches but code doesn't
      if (directoryByEmail.student_code !== studentCode) {
        return {
          status: 'DUPLICATE_IDENTITY',
          note: `อีเมลนี้มีอยู่แล้วด้วยรหัสนักศึกษาอื่น: ${directoryByEmail.student_code}`,
        };
      }
    }

    if (!student && !passwordHash) {
      return {
        status: 'MISSING',
        note: 'จำเป็นต้องระบุรหัสผ่านสำหรับนักศึกษาที่ยังไม่มีบัญชีในระบบ',
      };
    }

    if (student) {
      if (student.email !== email) {
        return {
          status: 'DUPLICATE_IDENTITY',
          note: `นักศึกษานี้มีอยู่แล้วด้วยอีเมลอื่น: ${student.email}`,
        };
      }
      return { status: 'EXISTS_NOT_ENROLLED' };
    }

    // 5. Directory-only identity can be enrolled after creating auth record.
    if (directoryByCode || directoryByEmail) {
      return { status: 'EXISTS_NOT_ENROLLED' };
    }

    // 6. No match anywhere - new student
    return { status: 'NEW' };
  }

  private async getSessionResponse(
    sessionId: string,
    offeringId?: bigint,
  ): Promise<PreviewSessionResponse> {
    const session = await this.prisma.import_preview_sessions.findUnique({
      where: { id: sessionId },
      include: {
        rows: {
          where: { is_deleted: false },
          orderBy: { row_index: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Preview session not found');
    }

    if (
      offeringId !== undefined &&
      session.course_offerings_id !== offeringId
    ) {
      throw new BadRequestException('Session does not belong to this offering');
    }

    const rows = session.rows.map((row) => this.formatRow(row));

    return {
      sessionId: session.id,
      expiresAt: session.expires_at,
      rows,
      summary: {
        total: rows.length,
        new: rows.filter((r) => r.status === 'NEW').length,
        existsNotEnrolled: rows.filter(
          (r) => r.status === 'EXISTS_NOT_ENROLLED',
        ).length,
        alreadyEnrolled: rows.filter((r) => r.status === 'ALREADY_ENROLLED')
          .length,
        duplicateIdentity: rows.filter((r) => r.status === 'DUPLICATE_IDENTITY')
          .length,
        missing: rows.filter((r) => r.status === 'MISSING').length,
      },
    };
  }

  private formatRow(row: any): PreviewRowResponse {
    return {
      id: row.id,
      row_index: row.row_index,
      student_code: row.student_code,
      email: row.email,
      has_password: Boolean(row.password_hash),
      facultyCode: row.facultyCode,
      title: row.title,
      curriculumId: row.curriculumId,
      first_name: row.first_name,
      last_name: row.last_name,
      status: row.status as PreviewRowStatus,
      note: row.note ?? undefined,
      is_deleted: row.is_deleted,
    };
  }
}
