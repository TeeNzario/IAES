/*
  Warnings:

  - You are about to drop the column `questions_id` on the `attempt_items` table. All the data in the column will be lost.
  - The primary key for the `knowledge_categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `course_offerings_id` on the `knowledge_categories` table. All the data in the column will be lost.
  - You are about to drop the column `knowledge_categories_id` on the `knowledge_categories` table. All the data in the column will be lost.
  - You are about to drop the column `knowledge_description` on the `knowledge_categories` table. All the data in the column will be lost.
  - You are about to drop the column `knowledge_name` on the `knowledge_categories` table. All the data in the column will be lost.
  - You are about to drop the `choices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[exam_attempts_id,question_id]` on the table `attempt_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `question_id` to the `attempt_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `knowledge_categories` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "attempt_answers" DROP CONSTRAINT "attempt_answers_attempt_items_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_answers" DROP CONSTRAINT "attempt_answers_selected_choice_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_items" DROP CONSTRAINT "attempt_items_exam_attempts_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_items" DROP CONSTRAINT "attempt_items_questions_id_fkey";

-- DropForeignKey
ALTER TABLE "choices" DROP CONSTRAINT "choices_questions_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_exams_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_student_code_fkey";

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_course_offerings_id_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_categories" DROP CONSTRAINT "knowledge_categories_course_offerings_id_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_exams_id_fkey";

-- DropIndex
DROP INDEX "attempt_items_exam_attempts_id_questions_id_key";

-- AlterTable
ALTER TABLE "attempt_items" DROP COLUMN "questions_id",
ADD COLUMN     "question_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "exams" ALTER COLUMN "title" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "knowledge_categories" DROP CONSTRAINT "knowledge_categories_pkey",
DROP COLUMN "course_offerings_id",
DROP COLUMN "knowledge_categories_id",
DROP COLUMN "knowledge_description",
DROP COLUMN "knowledge_name",
ADD COLUMN     "created_by_staff_id" BIGINT,
ADD COLUMN     "knowledge_category_id" BIGSERIAL NOT NULL,
ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD CONSTRAINT "knowledge_categories_pkey" PRIMARY KEY ("knowledge_category_id");

-- DropTable
DROP TABLE "choices";

-- DropTable
DROP TABLE "questions";

-- CreateTable
CREATE TABLE "course_knowledge_maps" (
    "courses_id" BIGINT NOT NULL,
    "knowledge_category_id" BIGINT NOT NULL,

    CONSTRAINT "course_knowledge_maps_pkey" PRIMARY KEY ("courses_id","knowledge_category_id")
);

-- CreateTable
CREATE TABLE "question_knowledge_maps" (
    "question_id" BIGINT NOT NULL,
    "knowledge_category_id" BIGINT NOT NULL,
    "courses_id" BIGINT NOT NULL,

    CONSTRAINT "question_knowledge_maps_pkey" PRIMARY KEY ("question_id","knowledge_category_id","courses_id")
);

-- CreateTable
CREATE TABLE "question_choices" (
    "choice_id" BIGSERIAL NOT NULL,
    "question_id" BIGINT NOT NULL,
    "choice_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_choices_pkey" PRIMARY KEY ("choice_id")
);

-- CreateTable
CREATE TABLE "question_bank" (
    "question_id" BIGSERIAL NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "question_type" NOT NULL DEFAULT 'MCQ_SINGLE',
    "difficulty_param" DOUBLE PRECISION,
    "discrimination_param" DOUBLE PRECISION,
    "guessing_param" DOUBLE PRECISION,
    "created_by_staff_id" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_bank_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "import_preview_sessions" (
    "id" TEXT NOT NULL,
    "course_offerings_id" BIGINT NOT NULL,
    "created_by" BIGINT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_preview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_preview_rows" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "row_index" INTEGER NOT NULL,
    "student_code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_preview_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "exams_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "sequence_index" INTEGER NOT NULL,
    "max_score" DECIMAL(5,2) NOT NULL,
    "shuffle_choice" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("exams_id","question_id")
);

-- CreateIndex
CREATE INDEX "import_preview_sessions_course_offerings_id_idx" ON "import_preview_sessions"("course_offerings_id");

-- CreateIndex
CREATE INDEX "import_preview_sessions_expires_at_idx" ON "import_preview_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "import_preview_rows_session_id_idx" ON "import_preview_rows"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_preview_rows_session_id_row_index_key" ON "import_preview_rows"("session_id", "row_index");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_items_exam_attempts_id_question_id_key" ON "attempt_items"("exam_attempts_id", "question_id");

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_items_id_fkey" FOREIGN KEY ("attempt_items_id") REFERENCES "attempt_items"("attempt_items_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_selected_choice_id_fkey" FOREIGN KEY ("selected_choice_id") REFERENCES "question_choices"("choice_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_exam_attempts_id_fkey" FOREIGN KEY ("exam_attempts_id") REFERENCES "exam_attempts"("exam_attempts_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exams_id_fkey" FOREIGN KEY ("exams_id") REFERENCES "exams"("exams_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_code_fkey" FOREIGN KEY ("student_code") REFERENCES "students"("student_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_course_offerings_id_fkey" FOREIGN KEY ("course_offerings_id") REFERENCES "course_offerings"("course_offerings_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_knowledge_maps" ADD CONSTRAINT "course_knowledge_maps_courses_id_fkey" FOREIGN KEY ("courses_id") REFERENCES "courses"("courses_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_knowledge_maps" ADD CONSTRAINT "course_knowledge_maps_knowledge_category_id_fkey" FOREIGN KEY ("knowledge_category_id") REFERENCES "knowledge_categories"("knowledge_category_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_knowledge_maps" ADD CONSTRAINT "question_knowledge_maps_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_knowledge_maps" ADD CONSTRAINT "question_knowledge_maps_knowledge_category_id_fkey" FOREIGN KEY ("knowledge_category_id") REFERENCES "knowledge_categories"("knowledge_category_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_knowledge_maps" ADD CONSTRAINT "question_knowledge_maps_courses_id_fkey" FOREIGN KEY ("courses_id") REFERENCES "courses"("courses_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_choices" ADD CONSTRAINT "question_choices_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_users"("staff_users_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_preview_sessions" ADD CONSTRAINT "import_preview_sessions_course_offerings_id_fkey" FOREIGN KEY ("course_offerings_id") REFERENCES "course_offerings"("course_offerings_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_preview_sessions" ADD CONSTRAINT "import_preview_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "staff_users"("staff_users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_preview_rows" ADD CONSTRAINT "import_preview_rows_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "import_preview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exams_id_fkey" FOREIGN KEY ("exams_id") REFERENCES "exams"("exams_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;
