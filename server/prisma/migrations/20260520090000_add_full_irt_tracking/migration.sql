ALTER TABLE "exam_attempts"
ADD COLUMN "standard_error" DOUBLE PRECISION,
ADD COLUMN "test_information" DOUBLE PRECISION,
ADD COLUMN "adaptive_stop_reason" VARCHAR(100),
ADD COLUMN "adaptive_completed_at" TIMESTAMPTZ(6);

CREATE TABLE "exam_theta_tracking" (
  "exam_theta_tracking_id" BIGSERIAL NOT NULL,
  "exam_attempts_id" BIGINT NOT NULL,
  "attempt_items_id" BIGINT,
  "question_id" BIGINT,
  "sequence_index" INTEGER NOT NULL,
  "theta_before" DOUBLE PRECISION NOT NULL,
  "theta_after" DOUBLE PRECISION NOT NULL,
  "standard_error" DOUBLE PRECISION,
  "test_information" DOUBLE PRECISION,
  "item_information" DOUBLE PRECISION,
  "score_function" DOUBLE PRECISION,
  "response_correct" BOOLEAN,
  "stop_reason" VARCHAR(100),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "exam_theta_tracking_pkey" PRIMARY KEY ("exam_theta_tracking_id")
);

CREATE INDEX "idx_exam_theta_tracking_attempt" ON "exam_theta_tracking"("exam_attempts_id");
CREATE INDEX "idx_exam_theta_tracking_item" ON "exam_theta_tracking"("attempt_items_id");
CREATE INDEX "idx_exam_theta_tracking_created_at" ON "exam_theta_tracking"("created_at");

ALTER TABLE "exam_theta_tracking"
ADD CONSTRAINT "exam_theta_tracking_exam_attempts_id_fkey"
FOREIGN KEY ("exam_attempts_id")
REFERENCES "exam_attempts"("exam_attempts_id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "exam_theta_tracking"
ADD CONSTRAINT "exam_theta_tracking_attempt_items_id_fkey"
FOREIGN KEY ("attempt_items_id")
REFERENCES "attempt_items"("attempt_items_id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "exam_theta_tracking"
ADD CONSTRAINT "exam_theta_tracking_question_id_fkey"
FOREIGN KEY ("question_id")
REFERENCES "question_bank"("question_id")
ON DELETE SET NULL
ON UPDATE CASCADE;

UPDATE "question_bank"
SET "difficulty_param" = GREATEST(-3, LEAST(3, "difficulty_param"))
WHERE "difficulty_param" IS NOT NULL
  AND ("difficulty_param" < -3 OR "difficulty_param" > 3);

UPDATE "question_bank"
SET "discrimination_param" = 1
WHERE "discrimination_param" IS NOT NULL
  AND "discrimination_param" < 0.5;

UPDATE "question_bank"
SET "discrimination_param" = 2.5
WHERE "discrimination_param" IS NOT NULL
  AND "discrimination_param" > 2.5;

UPDATE "question_bank"
SET "guessing_param" = 0.25
WHERE "guessing_param" IS NOT NULL
  AND ("guessing_param" < 0 OR "guessing_param" > 0.35);

ALTER TABLE "question_bank"
ADD CONSTRAINT "question_bank_irt_params_chk"
CHECK (
  ("difficulty_param" IS NULL OR "difficulty_param" BETWEEN -3 AND 3)
  AND ("discrimination_param" IS NULL OR "discrimination_param" BETWEEN 0.5 AND 2.5)
  AND ("guessing_param" IS NULL OR "guessing_param" BETWEEN 0 AND 0.35)
);

ALTER TABLE "exam_attempts"
ADD CONSTRAINT "exam_attempts_irt_info_chk"
CHECK (
  ("standard_error" IS NULL OR "standard_error" >= 0)
  AND ("test_information" IS NULL OR "test_information" >= 0)
);
