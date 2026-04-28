-- AlterTable
ALTER TABLE "course_exams" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "idx_course_exams_offering_active" ON "course_exams"("course_offerings_id", "is_active");
