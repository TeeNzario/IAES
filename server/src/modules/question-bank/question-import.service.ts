import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateQuestionImportSessionDto,
  EditQuestionImportRowDto,
  QuestionImportRowResponse,
  QuestionImportRowStatus,
  QuestionImportSessionResponse,
  QuestionImportConfirmResponse,
  QuestionImportResult,
  mapDifficultyLabel,
  validDifficultyLabels,
} from './dto/question-import.dto';
import { FIELD_LENGTHS } from 'src/lib/field-lengths';
import { AcademicSettingsService } from '../academic-settings/academic-settings.service';

const DIFFICULTY_DEFAULTS: Record<
  string,
  { discrimination: number; guessing: number }
> = {
  ง่าย: { discrimination: 0, guessing: 0.25 },
  กลาง: { discrimination: 0, guessing: 0.25 },
  ยาก: { discrimination: 0, guessing: 0.25 },
};

interface StaffActor {
  staffUserId: string;
  role: string;
}

interface CourseKnowledgeRef {
  knowledge_category_id: bigint;
  name: string;
  code: string;
}

function serializeBigInt<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  ) as T;
}

function splitCategoryTokens(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function categoryLookupKey(value: string): string {
  return value.trim().toLocaleLowerCase('th-TH');
}

function extractCategoryCodeSuffix(value: string): string | undefined {
  return value.trim().toUpperCase().match(/K\d+$/)?.[0];
}

@Injectable()
export class QuestionImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicSettings: AcademicSettingsService,
  ) {}

  private async getCourseCategoryLookup(
    coursesId: bigint,
  ): Promise<Map<string, CourseKnowledgeRef>> {
    const rows = await this.prisma.course_knowledge.findMany({
      where: { courses_id: coursesId },
      select: {
        knowledge_category_id: true,
        code: true,
        knowledge_categories: {
          select: { name: true },
        },
      },
    });

    const lookup = new Map<string, CourseKnowledgeRef>();
    const refs = rows.map((row) => ({
      knowledge_category_id: row.knowledge_category_id,
      name: row.knowledge_categories.name,
      code: row.code,
    }));

    for (const ref of refs) {
      const key = categoryLookupKey(ref.name);
      if (!lookup.has(key)) {
        lookup.set(key, ref);
      }
    }

    for (const ref of refs) {
      const suffix = extractCategoryCodeSuffix(ref.code);
      if (suffix) {
        const suffixKey = categoryLookupKey(suffix);
        if (!lookup.has(suffixKey)) {
          lookup.set(suffixKey, ref);
        }
      }
      const codeKey = categoryLookupKey(ref.code);
      if (!lookup.has(codeKey)) {
        lookup.set(codeKey, ref);
      }
    }

    return lookup;
  }

  private resolveCategoryIds(
    rawCategories: string,
    categoryLookup: Map<string, CourseKnowledgeRef>,
  ): bigint[] {
    return Array.from(
      new Set(
        splitCategoryTokens(rawCategories)
          .map((token) => categoryLookup.get(categoryLookupKey(token)))
          .filter((category): category is CourseKnowledgeRef =>
            Boolean(category),
          )
          .map((category) => category.knowledge_category_id),
      ),
    );
  }

  private async resolveCourseAndAuthorize(
    offeringId: string,
    actor: StaffActor,
  ): Promise<bigint> {
    const offering = await this.prisma.course_offerings.findUnique({
      where: { course_offerings_id: BigInt(offeringId) },
      select: { courses_id: true },
    });

    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    if (actor.role === 'ADMIN') {
      return offering.courses_id;
    }

    const link = await this.prisma.course_instructors.findFirst({
      where: {
        staff_users_id: BigInt(actor.staffUserId),
        course_offerings: { courses_id: offering.courses_id },
      },
      select: { staff_users_id: true },
    });

    if (!link) {
      throw new ForbiddenException('You are not an instructor of this course');
    }

    return offering.courses_id;
  }

  private async assertSessionBelongsToOffering(
    sessionId: string,
    offeringId: bigint,
  ) {
    const session = await this.prisma.question_import_sessions.findUnique({
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
   * Validate a single row. Returns [status, note].
   */
  private validateRow(
    row: {
      question_text?: string;
      choice_1?: string;
      choice_2?: string;
      choice_3?: string;
      choice_4?: string;
      correct?: number | string;
      difficulty?: string;
      knowledge_categories?: string;
    },
    categoryLookup: Map<string, CourseKnowledgeRef>,
  ): { status: QuestionImportRowStatus; note?: string } {
    // question_text
    const qText = row.question_text?.trim() ?? '';
    if (!qText) return { status: 'ERROR', note: 'ต้องระบุข้อความคำถาม' };
    if (qText.length > FIELD_LENGTHS.questionText)
      return {
        status: 'ERROR',
        note: `ข้อความคำถามต้องไม่เกิน ${FIELD_LENGTHS.questionText} ตัวอักษร`,
      };

    // choices
    const choices = [
      row.choice_1?.trim() ?? '',
      row.choice_2?.trim() ?? '',
      row.choice_3?.trim() ?? '',
      row.choice_4?.trim() ?? '',
    ];
    for (let i = 0; i < 4; i++) {
      if (!choices[i])
        return { status: 'ERROR', note: `ต้องระบุตัวเลือกที่ ${i + 1}` };
      if (choices[i].length > FIELD_LENGTHS.choiceText)
        return {
          status: 'ERROR',
          note: `ตัวเลือกที่ ${i + 1} ต้องไม่เกิน ${FIELD_LENGTHS.choiceText} ตัวอักษร`,
        };
    }

    // correct_choice
    const correct =
      typeof row.correct === 'string' ? parseInt(row.correct, 10) : row.correct;
    if (
      typeof correct !== 'number' ||
      !Number.isFinite(correct) ||
      correct < 1 ||
      correct > 4
    ) {
      return { status: 'ERROR', note: 'ต้องระบุคำตอบที่ถูกเป็นหมายเลข 1-4' };
    }

    // difficulty
    const diffLabel = row.difficulty?.trim() ?? '';
    if (!validDifficultyLabels().includes(diffLabel)) {
      return {
        status: 'ERROR',
        note: `ระดับความยากต้องเป็น ${validDifficultyLabels().join(', ')}`,
      };
    }

    // knowledge_categories
    const rawCat = row.knowledge_categories?.trim() ?? '';
    if (!rawCat) {
      return {
        status: 'ERROR',
        note: 'ต้องระบุหมวดหมู่ความรู้อย่างน้อย 1 รายการ',
      };
    }
    const catTokens = splitCategoryTokens(rawCat);
    if (catTokens.length === 0) {
      return {
        status: 'ERROR',
        note: 'ต้องระบุหมวดหมู่ความรู้อย่างน้อย 1 รายการ',
      };
    }
    const unknown = catTokens.filter(
      (token) => !categoryLookup.has(categoryLookupKey(token)),
    );
    if (unknown.length > 0) {
      return {
        status: 'ERROR',
        note: `ไม่พบรหัส/ชื่อหมวดหมู่ความรู้: ${unknown.join(', ')}`,
      };
    }

    return { status: 'NEW' };
  }

  /**
   * Create a preview session from CSV data.
   */
  async createPreviewSession(
    offeringId: string,
    actor: StaffActor,
    dto: CreateQuestionImportSessionDto,
  ): Promise<QuestionImportSessionResponse> {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);

    const categoryLookup = await this.getCourseCategoryLookup(coursesId);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const session = await this.prisma.question_import_sessions.create({
      data: {
        course_offerings_id: BigInt(offeringId),
        created_by: BigInt(actor.staffUserId),
        expires_at: expiresAt,
      },
    });

    const rowsData: Array<{
      session_id: string;
      row_index: number;
      question_text: string;
      choice_1: string;
      choice_2: string;
      choice_3: string;
      choice_4: string;
      correct_choice: number;
      difficulty: string;
      knowledge_categories: string;
      status: string;
      note?: string;
    }> = [];

    for (let i = 0; i < dto.rows.length; i++) {
      const r = dto.rows[i];
      const { status, note } = this.validateRow(r, categoryLookup);
      const correct =
        typeof r.correct === 'string'
          ? parseInt(r.correct, 10)
          : (r.correct as number);
      rowsData.push({
        session_id: session.id,
        row_index: i,
        question_text: (r.question_text ?? '').trim(),
        choice_1: (r.choice_1 ?? '').trim(),
        choice_2: (r.choice_2 ?? '').trim(),
        choice_3: (r.choice_3 ?? '').trim(),
        choice_4: (r.choice_4 ?? '').trim(),
        correct_choice:
          typeof correct === 'number' && Number.isFinite(correct) ? correct : 1,
        difficulty: r.difficulty?.trim() ?? '',
        knowledge_categories: r.knowledge_categories?.trim() ?? '',
        status,
        note,
      });
    }

    await this.prisma.question_import_rows.createMany({ data: rowsData });

    return this.getSessionResponse(session.id);
  }

  /**
   * Get session with non-deleted rows and summary.
   */
  async getPreviewSession(
    offeringId: string,
    sessionId: string,
    actor: StaffActor,
  ): Promise<QuestionImportSessionResponse> {
    await this.resolveCourseAndAuthorize(offeringId, actor);
    await this.assertSessionBelongsToOffering(sessionId, BigInt(offeringId));
    return this.getSessionResponse(sessionId);
  }

  private async getSessionResponse(
    sessionId: string,
  ): Promise<QuestionImportSessionResponse> {
    const session = await this.prisma.question_import_sessions.findUnique({
      where: { id: sessionId },
      select: { id: true, expires_at: true },
    });

    if (!session) {
      throw new NotFoundException('Preview session not found');
    }

    const rows = await this.prisma.question_import_rows.findMany({
      where: { session_id: sessionId, is_deleted: false },
      orderBy: { row_index: 'asc' },
    });

    const rowResponses: QuestionImportRowResponse[] = rows.map((r) => ({
      id: r.id,
      row_index: r.row_index,
      question_text: r.question_text,
      choice_1: r.choice_1,
      choice_2: r.choice_2,
      choice_3: r.choice_3,
      choice_4: r.choice_4,
      correct_choice: r.correct_choice,
      difficulty: r.difficulty,
      knowledge_categories: r.knowledge_categories,
      status: r.status as QuestionImportRowStatus,
      note: r.note ?? undefined,
      is_deleted: r.is_deleted,
    }));

    const total = rowResponses.length;
    const errors = rowResponses.filter((r) => r.status === 'ERROR').length;

    return serializeBigInt({
      sessionId: session.id,
      expiresAt: session.expires_at,
      rows: rowResponses,
      summary: {
        total,
        ready: total - errors,
        errors,
      },
    });
  }

  /**
   * Edit a preview row and re-validate.
   */
  async editPreviewRow(
    offeringId: string,
    sessionId: string,
    rowIndex: number,
    actor: StaffActor,
    dto: EditQuestionImportRowDto,
  ): Promise<QuestionImportRowResponse> {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);
    await this.assertSessionBelongsToOffering(sessionId, BigInt(offeringId));

    const existing = await this.prisma.question_import_rows.findUnique({
      where: {
        session_id_row_index: { session_id: sessionId, row_index: rowIndex },
      },
    });

    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Row not found');
    }

    const categoryLookup = await this.getCourseCategoryLookup(coursesId);

    // Merge edits with existing
    const merged = {
      question_text: dto.question_text ?? existing.question_text,
      choice_1: dto.choice_1 ?? existing.choice_1,
      choice_2: dto.choice_2 ?? existing.choice_2,
      choice_3: dto.choice_3 ?? existing.choice_3,
      choice_4: dto.choice_4 ?? existing.choice_4,
      correct: dto.correct ?? existing.correct_choice,
      difficulty: dto.difficulty ?? existing.difficulty,
      knowledge_categories:
        dto.knowledge_categories ?? existing.knowledge_categories,
    };

    const { status, note } = this.validateRow(merged, categoryLookup);
    const correct =
      typeof merged.correct === 'string'
        ? parseInt(merged.correct, 10)
        : merged.correct;

    const updated = await this.prisma.question_import_rows.update({
      where: {
        session_id_row_index: { session_id: sessionId, row_index: rowIndex },
      },
      data: {
        question_text: merged.question_text,
        choice_1: merged.choice_1,
        choice_2: merged.choice_2,
        choice_3: merged.choice_3,
        choice_4: merged.choice_4,
        correct_choice:
          typeof correct === 'number' && Number.isFinite(correct) ? correct : 1,
        difficulty: merged.difficulty,
        knowledge_categories: merged.knowledge_categories,
        status,
        note: note ?? null,
        updated_at: new Date(),
      },
    });

    return {
      id: updated.id,
      row_index: updated.row_index,
      question_text: updated.question_text,
      choice_1: updated.choice_1,
      choice_2: updated.choice_2,
      choice_3: updated.choice_3,
      choice_4: updated.choice_4,
      correct_choice: updated.correct_choice,
      difficulty: updated.difficulty,
      knowledge_categories: updated.knowledge_categories,
      status: updated.status as QuestionImportRowStatus,
      note: updated.note ?? undefined,
      is_deleted: updated.is_deleted,
    };
  }

  /**
   * Soft-delete a preview row.
   */
  async deletePreviewRow(
    offeringId: string,
    sessionId: string,
    rowIndex: number,
    actor: StaffActor,
  ): Promise<void> {
    await this.resolveCourseAndAuthorize(offeringId, actor);
    await this.assertSessionBelongsToOffering(sessionId, BigInt(offeringId));

    const existing = await this.prisma.question_import_rows.findUnique({
      where: {
        session_id_row_index: { session_id: sessionId, row_index: rowIndex },
      },
    });

    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Row not found');
    }

    await this.prisma.question_import_rows.update({
      where: {
        session_id_row_index: { session_id: sessionId, row_index: rowIndex },
      },
      data: { is_deleted: true, updated_at: new Date() },
    });
  }

  /**
   * Confirm import: bulk-create all NEW rows, skip ERROR rows, delete session.
   */
  async confirmSession(
    offeringId: string,
    sessionId: string,
    actor: StaffActor,
  ): Promise<QuestionImportConfirmResponse> {
    await this.resolveCourseAndAuthorize(offeringId, actor);
    await this.assertSessionBelongsToOffering(sessionId, BigInt(offeringId));

    const rows = await this.prisma.question_import_rows.findMany({
      where: { session_id: sessionId, is_deleted: false },
      orderBy: { row_index: 'asc' },
    });

    // Load knowledge categories for this offering's course
    const offering = await this.prisma.course_offerings.findUnique({
      where: { course_offerings_id: BigInt(offeringId) },
      select: { courses_id: true },
    });

    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    const categoryLookup = await this.getCourseCategoryLookup(
      offering.courses_id,
    );

    // Resolve default collection
    const collectionId = await this.resolveDefaultCollectionId(
      offeringId,
      actor,
      offering.courses_id,
    );

    const results: QuestionImportResult[] = [];

    for (const row of rows) {
      if (row.status === 'ERROR') {
        results.push({
          row_index: row.row_index,
          question_text: row.question_text,
          status: 'skipped',
          note: row.note ?? 'ข้อมูลไม่ถูกต้อง',
        });
        continue;
      }

      const validation = this.validateRow(
        {
          question_text: row.question_text,
          choice_1: row.choice_1,
          choice_2: row.choice_2,
          choice_3: row.choice_3,
          choice_4: row.choice_4,
          correct: row.correct_choice,
          difficulty: row.difficulty,
          knowledge_categories: row.knowledge_categories,
        },
        categoryLookup,
      );

      if (validation.status === 'ERROR') {
        results.push({
          row_index: row.row_index,
          question_text: row.question_text,
          status: 'skipped',
          note: validation.note ?? 'ข้อมูลไม่ถูกต้อง',
        });
        continue;
      }

      try {
        const catIds = this.resolveCategoryIds(
          row.knowledge_categories,
          categoryLookup,
        );

        const difficultyParam = mapDifficultyLabel(row.difficulty);
        const defaults = DIFFICULTY_DEFAULTS[row.difficulty] ?? {
          discrimination: 0,
          guessing: 0.25,
        };

        await this.prisma.question_bank.create({
          data: {
            question_text: row.question_text,
            question_type: 'MCQ_SINGLE',
            difficulty_param: difficultyParam,
            discrimination_param: defaults.discrimination,
            guessing_param: defaults.guessing,
            question_collection_id: BigInt(collectionId),
            created_by_staff_id: BigInt(actor.staffUserId),
            choices: {
              create: [
                {
                  choice_text: row.choice_1,
                  is_correct: row.correct_choice === 1,
                  display_order: 0,
                },
                {
                  choice_text: row.choice_2,
                  is_correct: row.correct_choice === 2,
                  display_order: 1,
                },
                {
                  choice_text: row.choice_3,
                  is_correct: row.correct_choice === 3,
                  display_order: 2,
                },
                {
                  choice_text: row.choice_4,
                  is_correct: row.correct_choice === 4,
                  display_order: 3,
                },
              ],
            },
            ...(catIds.length > 0
              ? {
                  question_knowledge: {
                    create: catIds.map((kid) => ({
                      knowledge_category_id: kid,
                      courses_id: offering.courses_id,
                    })),
                  },
                }
              : {}),
          },
        });

        results.push({
          row_index: row.row_index,
          question_text: row.question_text,
          status: 'imported',
        });
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message ?? 'บันทึกไม่สำเร็จ';
        results.push({
          row_index: row.row_index,
          question_text: row.question_text,
          status: 'failed',
          note: msg,
        });
      }
    }

    // Delete session
    await this.prisma.question_import_sessions.delete({
      where: { id: sessionId },
    });

    const imported = results.filter((r) => r.status === 'imported').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    return serializeBigInt({
      results,
      summary: {
        total: results.length,
        imported,
        failed,
        skipped,
      },
    });
  }

  /**
   * Resolve (creating if necessary) a default question collection.
   * Uses find-then-create with a unique-constraint catch to safely
   * handle concurrent imports for the same course.
   */
  private async resolveDefaultCollectionId(
    offeringId: string,
    actor: StaffActor,
    coursesId: bigint,
  ): Promise<string> {
    const DEFAULT_TITLE = 'คำถามทั่วไป';
    const { academic_year: currentYear } =
      await this.academicSettings.getCurrentTerm();

    // Find or create a year for the current academic year
    let year = await this.prisma.question_bank_years.findFirst({
      where: {
        courses: {
          course_offerings: {
            some: { course_offerings_id: BigInt(offeringId) },
          },
        },
        academic_year: currentYear,
      },
      select: { question_bank_year_id: true },
    });

    if (!year) {
      try {
        year = await this.prisma.question_bank_years.create({
          data: {
            courses_id: coursesId,
            academic_year: currentYear,
            created_by_staff_id: BigInt(actor.staffUserId),
          },
          select: { question_bank_year_id: true },
        });
      } catch {
        // Race: another request created the year between our findFirst and create
        year = await this.prisma.question_bank_years.findFirst({
          where: {
            courses: {
              course_offerings: {
                some: { course_offerings_id: BigInt(offeringId) },
              },
            },
            academic_year: currentYear,
          },
          select: { question_bank_year_id: true },
        });

        if (!year) {
          throw new BadRequestException(
            'ไม่สามารถสร้างหรือค้นหาชุดข้อสอบได้ กรุณาลองใหม่',
          );
        }
      }
    }

    // Find or create default collection
    let collection = await this.prisma.question_collections.findFirst({
      where: {
        question_bank_year_id: year.question_bank_year_id,
        title: DEFAULT_TITLE,
      },
      select: { question_collection_id: true },
    });

    if (!collection) {
      try {
        collection = await this.prisma.question_collections.create({
          data: {
            question_bank_year_id: year.question_bank_year_id,
            title: DEFAULT_TITLE,
            created_by_staff_id: BigInt(actor.staffUserId),
          },
          select: { question_collection_id: true },
        });
      } catch {
        // Race: another request created the collection
        collection = await this.prisma.question_collections.findFirst({
          where: {
            question_bank_year_id: year.question_bank_year_id,
            title: DEFAULT_TITLE,
          },
          select: { question_collection_id: true },
        });

        if (!collection) {
          throw new BadRequestException(
            'ไม่สามารถสร้างหรือค้นหาชุดข้อสอบได้ กรุณาลองใหม่',
          );
        }
      }
    }

    return collection.question_collection_id.toString();
  }
}
