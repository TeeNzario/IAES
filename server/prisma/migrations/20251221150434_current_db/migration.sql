/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "exam_attempt_status" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('MCQ_SINGLE', 'MCQ_MULTI');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('INSTRUCTOR', 'ADMIN');

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "fk_user";

-- DropTable
DROP TABLE "Post";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "attempt_answers" (
    "attempt_answers_id" BIGSERIAL NOT NULL,
    "attempt_items_id" BIGINT NOT NULL,
    "selected_choice_id" BIGINT,
    "answer_text" TEXT,
    "is_correct" BOOLEAN,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("attempt_answers_id")
);

-- CreateTable
CREATE TABLE "attempt_items" (
    "attempt_items_id" BIGSERIAL NOT NULL,
    "exam_attempts_id" BIGINT NOT NULL,
    "questions_id" BIGINT NOT NULL,
    "sequence_index" INTEGER NOT NULL,
    "shown_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMPTZ(6),
    "time_per_item" INTEGER,
    "shuffled_choice_order" JSONB,
    "choice_selection_log" JSONB,

    CONSTRAINT "attempt_items_pkey" PRIMARY KEY ("attempt_items_id")
);

-- CreateTable
CREATE TABLE "choices" (
    "choices_id" BIGSERIAL NOT NULL,
    "questions_id" BIGINT NOT NULL,
    "choice_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "choices_pkey" PRIMARY KEY ("choices_id")
);

-- CreateTable
CREATE TABLE "course_announcements" (
    "course_announcements_id" BIGSERIAL NOT NULL,
    "course_offerings_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "created_by_staff_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_announcements_pkey" PRIMARY KEY ("course_announcements_id")
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "course_enrollments_id" BIGSERIAL NOT NULL,
    "course_offerings_id" BIGINT NOT NULL,
    "students_id" BIGINT NOT NULL,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("course_enrollments_id")
);

-- CreateTable
CREATE TABLE "course_instructors" (
    "course_offerings_id" BIGINT NOT NULL,
    "staff_users_id" BIGINT NOT NULL,

    CONSTRAINT "course_instructors_pkey" PRIMARY KEY ("course_offerings_id","staff_users_id")
);

-- CreateTable
CREATE TABLE "course_offerings" (
    "course_offerings_id" BIGSERIAL NOT NULL,
    "courses_id" BIGINT NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "semester" SMALLINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("course_offerings_id")
);

-- CreateTable
CREATE TABLE "courses" (
    "courses_id" BIGSERIAL NOT NULL,
    "course_code" VARCHAR(50) NOT NULL,
    "course_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("courses_id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "exam_attempts_id" BIGSERIAL NOT NULL,
    "exams_id" BIGINT NOT NULL,
    "students_id" BIGINT NOT NULL,
    "status" "exam_attempt_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(6),
    "total_score" DECIMAL(7,2),
    "passed" BOOLEAN,
    "total_level" DOUBLE PRECISION,
    "time_per_exam" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("exam_attempts_id")
);

-- CreateTable
CREATE TABLE "exams" (
    "exams_id" BIGSERIAL NOT NULL,
    "course_offerings_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "show_results_immediately" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("exams_id")
);

-- CreateTable
CREATE TABLE "knowledge_categories" (
    "knowledge_categories_id" BIGSERIAL NOT NULL,
    "course_offerings_id" BIGINT NOT NULL,
    "knowledge_name" VARCHAR(255) NOT NULL,
    "knowledge_description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_categories_pkey" PRIMARY KEY ("knowledge_categories_id")
);

-- CreateTable
CREATE TABLE "questions" (
    "questions_id" BIGSERIAL NOT NULL,
    "exams_id" BIGINT NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "question_type" NOT NULL DEFAULT 'MCQ_SINGLE',
    "difficulty_param" DOUBLE PRECISION,
    "discrimination_param" DOUBLE PRECISION,
    "guessing_param" DOUBLE PRECISION,
    "max_score" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "display_order" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("questions_id")
);

-- CreateTable
CREATE TABLE "staff_users" (
    "staff_users_id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("staff_users_id")
);

-- CreateTable
CREATE TABLE "student_directory" (
    "student_directory_id" BIGSERIAL NOT NULL,
    "student_code" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_directory_pkey" PRIMARY KEY ("student_directory_id")
);

-- CreateTable
CREATE TABLE "students" (
    "students_id" BIGSERIAL NOT NULL,
    "student_code" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("students_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attempt_items_exam_attempts_id_questions_id_key" ON "attempt_items"("exam_attempts_id", "questions_id");

-- CreateIndex
CREATE INDEX "idx_course_enrollments_offering" ON "course_enrollments"("course_offerings_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_course_offerings_id_students_id_key" ON "course_enrollments"("course_offerings_id", "students_id");

-- CreateIndex
CREATE INDEX "idx_course_offerings_course" ON "course_offerings"("courses_id");

-- CreateIndex
CREATE INDEX "idx_exam_attempts_exam" ON "exam_attempts"("exams_id");

-- CreateIndex
CREATE INDEX "idx_exam_attempts_student" ON "exam_attempts"("students_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_exams_id_students_id_key" ON "exam_attempts"("exams_id", "students_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- CreateIndex
CREATE INDEX "idx_staff_users_role" ON "staff_users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "student_directory_email_key" ON "student_directory"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_code_key" ON "students"("student_code");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_items_id_fkey" FOREIGN KEY ("attempt_items_id") REFERENCES "attempt_items"("attempt_items_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_selected_choice_id_fkey" FOREIGN KEY ("selected_choice_id") REFERENCES "choices"("choices_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_exam_attempts_id_fkey" FOREIGN KEY ("exam_attempts_id") REFERENCES "exam_attempts"("exam_attempts_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_questions_id_fkey" FOREIGN KEY ("questions_id") REFERENCES "questions"("questions_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "choices" ADD CONSTRAINT "choices_questions_id_fkey" FOREIGN KEY ("questions_id") REFERENCES "questions"("questions_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_announcements" ADD CONSTRAINT "course_announcements_course_offerings_id_fkey" FOREIGN KEY ("course_offerings_id") REFERENCES "course_offerings"("course_offerings_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_announcements" ADD CONSTRAINT "course_announcements_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_users"("staff_users_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_offerings_id_fkey" FOREIGN KEY ("course_offerings_id") REFERENCES "course_offerings"("course_offerings_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_students_id_fkey" FOREIGN KEY ("students_id") REFERENCES "students"("students_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_instructors" ADD CONSTRAINT "course_instructors_course_offerings_id_fkey" FOREIGN KEY ("course_offerings_id") REFERENCES "course_offerings"("course_offerings_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_instructors" ADD CONSTRAINT "course_instructors_staff_users_id_fkey" FOREIGN KEY ("staff_users_id") REFERENCES "staff_users"("staff_users_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_courses_id_fkey" FOREIGN KEY ("courses_id") REFERENCES "courses"("courses_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exams_id_fkey" FOREIGN KEY ("exams_id") REFERENCES "exams"("exams_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_students_id_fkey" FOREIGN KEY ("students_id") REFERENCES "students"("students_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_course_offerings_id_fkey" FOREIGN KEY ("course_offerings_id") REFERENCES "course_offerings"("course_offerings_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_categories" ADD CONSTRAINT "knowledge_categories_course_offerings_id_fkey" FOREIGN KEY ("course_offerings_id") REFERENCES "course_offerings"("course_offerings_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_exams_id_fkey" FOREIGN KEY ("exams_id") REFERENCES "exams"("exams_id") ON DELETE CASCADE ON UPDATE NO ACTION;
