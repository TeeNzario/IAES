-- CreateTable
CREATE TABLE "exam_behavior_logs" (
    "exam_behavior_logs_id" BIGSERIAL NOT NULL,
    "exam_attempts_id" BIGINT NOT NULL,
    "attempt_items_id" BIGINT,
    "question_id" BIGINT,
    "event_type" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_behavior_logs_pkey" PRIMARY KEY ("exam_behavior_logs_id")
);

-- CreateIndex
CREATE INDEX "idx_exam_behavior_logs_attempt" ON "exam_behavior_logs"("exam_attempts_id");

-- CreateIndex
CREATE INDEX "idx_exam_behavior_logs_event_type" ON "exam_behavior_logs"("event_type");

-- CreateIndex
CREATE INDEX "idx_exam_behavior_logs_occurred_at" ON "exam_behavior_logs"("occurred_at");

-- AddForeignKey
ALTER TABLE "exam_behavior_logs" ADD CONSTRAINT "exam_behavior_logs_exam_attempts_id_fkey" FOREIGN KEY ("exam_attempts_id") REFERENCES "exam_attempts"("exam_attempts_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_behavior_logs" ADD CONSTRAINT "exam_behavior_logs_attempt_items_id_fkey" FOREIGN KEY ("attempt_items_id") REFERENCES "attempt_items"("attempt_items_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_behavior_logs" ADD CONSTRAINT "exam_behavior_logs_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("question_id") ON DELETE SET NULL ON UPDATE CASCADE;
