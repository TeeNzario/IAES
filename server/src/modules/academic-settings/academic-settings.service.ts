import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditActor, AuditService } from '../audit/audit.service';
import { UpdateAcademicSettingsDto } from './dto/update-academic-settings.dto';

interface AcademicSettingsRow {
  id: number;
  academic_year: number;
  semester: number;
  updated_by_staff_id: bigint | null;
  created_at: Date;
  updated_at: Date;
}

export interface AcademicSettingsResponse {
  id: number;
  academic_year: number;
  semester: number;
  updated_by_staff_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentAcademicTerm {
  academic_year: number;
  semester: number;
}

function toResponse(row: AcademicSettingsRow): AcademicSettingsResponse {
  return {
    id: row.id,
    academic_year: row.academic_year,
    semester: row.semester,
    updated_by_staff_id: row.updated_by_staff_id?.toString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

@Injectable()
export class AcademicSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private fallbackAcademicYear() {
    return new Date().getFullYear();
  }

  private async readCurrentRow(
    client: Pick<PrismaService, '$queryRaw'> = this.prisma,
  ) {
    const rows = await client.$queryRaw<AcademicSettingsRow[]>`
      SELECT
        "id",
        "academic_year",
        "semester",
        "updated_by_staff_id",
        "created_at",
        "updated_at"
      FROM "academic_settings"
      WHERE "id" = 1
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  private async ensureCurrentRow(): Promise<AcademicSettingsRow> {
    const existing = await this.readCurrentRow();
    if (existing) return existing;

    await this.prisma.$executeRaw`
      INSERT INTO "academic_settings" (
        "id",
        "academic_year",
        "semester"
      )
      VALUES (
        1,
        ${this.fallbackAcademicYear()},
        1
      )
      ON CONFLICT ("id") DO NOTHING
    `;

    const created = await this.readCurrentRow();
    if (created) return created;

    throw new InternalServerErrorException(
      'Unable to initialize academic settings',
    );
  }

  async getCurrent(): Promise<AcademicSettingsResponse> {
    return toResponse(await this.ensureCurrentRow());
  }

  async getCurrentTerm(): Promise<CurrentAcademicTerm> {
    const settings = await this.ensureCurrentRow();
    return {
      academic_year: settings.academic_year,
      semester: settings.semester,
    };
  }

  async updateCurrent(
    dto: UpdateAcademicSettingsDto,
    actor: AuditActor,
  ): Promise<AcademicSettingsResponse> {
    const previous = await this.ensureCurrentRow();
    const actorId = BigInt(actor.id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<AcademicSettingsRow[]>`
        INSERT INTO "academic_settings" (
          "id",
          "academic_year",
          "semester",
          "updated_by_staff_id",
          "updated_at"
        )
        VALUES (
          1,
          ${dto.academic_year},
          ${dto.semester},
          ${actorId},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("id") DO UPDATE SET
          "academic_year" = EXCLUDED."academic_year",
          "semester" = EXCLUDED."semester",
          "updated_by_staff_id" = EXCLUDED."updated_by_staff_id",
          "updated_at" = CURRENT_TIMESTAMP
        RETURNING
          "id",
          "academic_year",
          "semester",
          "updated_by_staff_id",
          "created_at",
          "updated_at"
      `;

      const next = rows[0];
      if (!next) {
        throw new InternalServerErrorException(
          'Unable to update academic settings',
        );
      }

      await this.audit.record(
        {
          actor,
          action: 'ACADEMIC_SETTINGS_UPDATED',
          entityType: 'academic_settings',
          entityId: 'current',
          metadata: {
            previous: {
              academic_year: previous.academic_year,
              semester: previous.semester,
            },
            next: {
              academic_year: next.academic_year,
              semester: next.semester,
            },
          },
        },
        tx,
      );

      return next;
    });

    return toResponse(updated);
  }
}
