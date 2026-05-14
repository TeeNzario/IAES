-- AlterTable
ALTER TABLE "course_exams" ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing exams that were visible before should remain visible
UPDATE "course_exams" SET "is_published" = true;

-- CreateIndex
CREATE INDEX "idx_course_exams_offering_published" ON "course_exams"("course_offerings_id", "is_published");
