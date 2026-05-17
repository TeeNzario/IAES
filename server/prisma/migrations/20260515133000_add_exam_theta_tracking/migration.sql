ALTER TABLE "exam_attempts"
ADD COLUMN "theta_estimate" DOUBLE PRECISION;

ALTER TABLE "attempt_items"
ADD COLUMN "theta_at_selection" DOUBLE PRECISION;

UPDATE "exam_attempts"
SET "theta_estimate" = "total_level"
WHERE "theta_estimate" IS NULL
  AND "total_level" IS NOT NULL;
