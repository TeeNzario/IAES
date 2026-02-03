import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreatePreviewSessionDto,
  EditPreviewRowDto,
  PreviewRowResponse,
  PreviewRowStatus,
  PreviewSessionResponse,
  ConfirmResponse,
  ConfirmResult,
} from './dto/preview-import.dto';

@Injectable()
export class PreviewImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a preview session from CSV data
   */
  async createPreviewSession(
    offeringId: string,
    createdBy: number,
    dto: CreatePreviewSessionDto,
  ): Promise<PreviewSessionResponse> {
    const offeringBigInt = BigInt(offeringId);


    console.log('DEBUG dto =', dto);
  console.log('DEBUG dto.rows =', dto?.rows);
  

    // Session expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Create session and rows in transaction
    const session = await this.prisma.$transaction(async (tx) => {
      const newSession = await tx.import_preview_sessions.create({
        data: {
          course_offerings_id: offeringBigInt,
          created_by: createdBy,
          expires_at: expiresAt,
        },
      });

      // Validate and create rows
      const rowsData = await Promise.all(
        dto.rows.map(async (row, index) => {
          const { status, note } = await this.validateRow(
            tx,
            offeringBigInt,
            row.student_code,
            row.email,
            row.first_name,
            row.last_name,
          );

          return {
            session_id: newSession.id,
            row_index: index,
            student_code: row.student_code || '',
            email: row.email || '',
            first_name: row.first_name || '',
            last_name: row.last_name || '',
            status,
            note,
          };
        }),
      );

      await tx.import_preview_rows.createMany({ data: rowsData });

      return newSession;
    });

    // Fetch the complete session with rows
    return this.getSessionResponse(session.id);
  }

  /**
   * Edit a preview row and revalidate its status
   */
  async editPreviewRow(
    offeringId: string,
    sessionId: string,
    rowIndex: number,
    dto: EditPreviewRowDto,
  ): Promise<PreviewRowResponse> {
    const offeringBigInt = BigInt(offeringId);

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

    // Merge edits
    const updatedData = {
      student_code: dto.student_code ?? row.student_code,
      email: dto.email ?? row.email,
      first_name: dto.first_name ?? row.first_name,
      last_name: dto.last_name ?? row.last_name,
    };

    // Revalidate with new data
    const { status, note } = await this.validateRow(
      this.prisma,
      offeringBigInt,
      updatedData.student_code,
      updatedData.email,
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
        status,
        note,
        updated_at: new Date(),
      },
    });

    return this.formatRow(updated);
  }

  /**
   * Delete a preview row (soft delete)
   */
  async deletePreviewRow(sessionId: string, rowIndex: number): Promise<void> {
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
  async getPreviewSession(sessionId: string): Promise<PreviewSessionResponse> {
    return this.getSessionResponse(sessionId);
  }

  /**
   * Confirm a preview session and enroll students
   */
  async confirmSession(
    offeringId: string,
    sessionId: string,
  ): Promise<ConfirmResponse> {
    const offeringBigInt = BigInt(offeringId);

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
          note: 'Missing required fields',
        });
        continue;
      }

      // Skip already enrolled
      if (row.status === 'ALREADY_ENROLLED') {
        results.push({
          student_code: row.student_code,
          email: row.email,
          status: 'already_enrolled',
        });
        continue;
      }

      try {
        await this.prisma.$transaction(async (tx) => {
          // Step 1: Upsert student_directory
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

          // Step 2: Upsert students table
          await tx.students.upsert({
            where: { student_code: row.student_code },
            update: {
              email: row.email,
              first_name: row.first_name,
              last_name: row.last_name,
            },
            create: {
              student_code: row.student_code,
              email: row.email,
              password_hash: '12345678', // Placeholder
              first_name: row.first_name,
              last_name: row.last_name,
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
        });
      } catch (error) {
        results.push({
          student_code: row.student_code,
          email: row.email,
          status: 'failed',
          note: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Delete the session after confirm
    await this.prisma.import_preview_sessions.delete({
      where: { id: sessionId },
    });

    return {
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
  }

  /**
   * Validate a row against student_directory, students, and course_enrollments
   */
  private async validateRow(
    tx: any, // Prisma transaction or client
    offeringId: bigint,
    studentCode: string,
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<{ status: PreviewRowStatus; note?: string }> {
    // 1. Check required fields
    if (!studentCode || !email || !firstName || !lastName) {
      return { status: 'MISSING', note: 'Required fields missing' };
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

    // 3. Check student_directory for identity conflicts
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
          note: `Code matches ${directoryByCode.email}, email matches ${directoryByEmail.student_code}`,
        };
      }
      // Same record - check if name matches
      if (
        directoryByCode.first_name !== firstName ||
        directoryByCode.last_name !== lastName
      ) {
        return {
          status: 'EXISTS_NOT_ENROLLED',
          note: `Name differs: ${directoryByCode.first_name} ${directoryByCode.last_name}`,
        };
      }
      return { status: 'EXISTS_NOT_ENROLLED' };
    }

    if (directoryByCode) {
      // Code matches but email doesn't
      if (directoryByCode.email !== email) {
        return {
          status: 'DUPLICATE_IDENTITY',
          note: `Student code exists with different email: ${directoryByCode.email}`,
        };
      }
    }

    if (directoryByEmail) {
      // Email matches but code doesn't
      if (directoryByEmail.student_code !== studentCode) {
        return {
          status: 'DUPLICATE_IDENTITY',
          note: `Email exists with different code: ${directoryByEmail.student_code}`,
        };
      }
    }

    // 4. Check students table
    const student = await tx.students.findUnique({
      where: { student_code: studentCode },
    });

    if (student) {
      if (student.email !== email) {
        return {
          status: 'DUPLICATE_IDENTITY',
          note: `Student exists with different email: ${student.email}`,
        };
      }
      return { status: 'EXISTS_NOT_ENROLLED' };
    }

    // 5. No match anywhere - new student
    return { status: 'NEW' };
  }

  private async getSessionResponse(
    sessionId: string,
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

    const rows = session.rows.map(this.formatRow);

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
      first_name: row.first_name,
      last_name: row.last_name,
      status: row.status as PreviewRowStatus,
      note: row.note,
      is_deleted: row.is_deleted,
    };
  }
}
