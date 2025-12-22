/*
  Warnings:

  - You are about to drop the column `students_id` on the `course_enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `students_id` on the `exam_attempts` table. All the data in the column will be lost.
  - The primary key for the `students` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `students_id` on the `students` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[course_offerings_id,student_code]` on the table `course_enrollments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[exams_id,student_code]` on the table `exam_attempts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `student_code` to the `course_enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_code` to the `exam_attempts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_students_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_students_id_fkey";

-- DropIndex
DROP INDEX "course_enrollments_course_offerings_id_students_id_key";

-- DropIndex
DROP INDEX "exam_attempts_exams_id_students_id_key";

-- DropIndex
DROP INDEX "idx_exam_attempts_student";

-- DropIndex
DROP INDEX "students_student_code_key";

-- AlterTable
ALTER TABLE "course_enrollments" DROP COLUMN "students_id",
ADD COLUMN     "student_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "exam_attempts" DROP COLUMN "students_id",
ADD COLUMN     "student_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP CONSTRAINT "students_pkey",
DROP COLUMN "students_id",
ADD CONSTRAINT "students_pkey" PRIMARY KEY ("student_code");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_course_offerings_id_student_code_key" ON "course_enrollments"("course_offerings_id", "student_code");

-- CreateIndex
CREATE INDEX "idx_exam_attempts_student" ON "exam_attempts"("student_code");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_exams_id_student_code_key" ON "exam_attempts"("exams_id", "student_code");

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_student_code_fkey" FOREIGN KEY ("student_code") REFERENCES "students"("student_code") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_code_fkey" FOREIGN KEY ("student_code") REFERENCES "students"("student_code") ON DELETE CASCADE ON UPDATE NO ACTION;
