CREATE TABLE IF NOT EXISTS "audit_logs" (
  "audit_logs_id" BIGSERIAL PRIMARY KEY,
  "actor_type" VARCHAR(20),
  "actor_id" VARCHAR(100),
  "action" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" VARCHAR(100) NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_action"
  ON "audit_logs"("action");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity"
  ON "audit_logs"("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at"
  ON "audit_logs"("created_at");
