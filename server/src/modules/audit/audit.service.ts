import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type AuditActorType = 'staff' | 'student' | 'system';

export interface AuditActor {
  type: AuditActorType;
  id: string;
}

export interface AuditEvent {
  actor?: AuditActor;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

type AuditClient = Pick<PrismaService, '$executeRaw'>;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEvent, client: AuditClient = this.prisma) {
    const actorType = event.actor?.type ?? null;
    const actorId = event.actor?.id ?? null;
    const metadata = JSON.stringify(event.metadata ?? {});

    await client.$executeRaw`
      INSERT INTO "audit_logs" (
        "actor_type",
        "actor_id",
        "action",
        "entity_type",
        "entity_id",
        "metadata"
      )
      VALUES (
        ${actorType},
        ${actorId},
        ${event.action},
        ${event.entityType},
        ${event.entityId},
        ${metadata}::jsonb
      )
    `;
  }
}
