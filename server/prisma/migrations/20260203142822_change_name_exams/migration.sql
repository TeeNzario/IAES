/*
  Warnings:

  - You are about to drop the column `shuffled_choice_order` on the `attempt_items` table. All the data in the column will be lost.
  - You are about to drop the column `exams_id` on the `exam_attempts` table. All the data in the column will be lost.
  - The primary key for the `exam_questions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `exams_id` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the `exams` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[course_exams_id,student_code]` on the table `exam_attempts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `course_exams_id` to the `exam_attempts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `course_exams_id` to the `exam_questions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_exams_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_exams_id_fkey";

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_course_offerings_id_fkey";

-- DropIndex
DROP INDEX "exam_attempts_exams_id_student_code_key";

-- DropIndex
DROP INDEX "idx_exam_attempts_exam";

-- AlterTable
ALTER TABLE "attempt_items" DROP COLUMN "shuffled_choice_order";

-- AlterTable
ALTER TABLE "exam_attempts" DROP COLUMN "exams_id",
ADD COLUMN     "course_exams_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_pkey",
DROP COLUMN "exams_id",
ADD COLUMN     "course_exams_id" BIGINT NOT NULL,
ADD CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("course_exams_id", "question_id");

-- DropTable
DROP TABLE "exams";

-- CreateTable
CREATE TABLE "course_exams" (
    "course_exams_id" BIGSERIAL NOT NULL,
    "course_offerings_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "show_results_immediately" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_exams_pkey" PRIMARY KEY ("course_exams_id")
);

-- CreateIndex
CREATE INDEX "idx_exam_attempts_exam" ON "exam_attempts"("course_exams_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_course_exams_id_student_code_key" ON "exam_attempts"("course_exams_id", "student_code");

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_course_exams_id_fkey" FOREIGN KEY ("course_exams_id") REFERENCES "course_exams"("course_exams_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_exams" ADD CONSTRAINT "course_exams_course_offerings_id_fkey" FOREIGN KEY ("course_offerings_id") REFERENCES "course_offerings"("course_offerings_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_course_exams_id_fkey" FOREIGN KEY ("course_exams_id") REFERENCES "course_exams"("course_exams_id") ON DELETE CASCADE ON UPDATE CASCADE;
