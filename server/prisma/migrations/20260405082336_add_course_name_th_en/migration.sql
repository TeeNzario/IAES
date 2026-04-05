/*
  Warnings:

  - Added the required column `course_name_en` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `course_name_th` to the `courses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "course_name_en" VARCHAR(255) NOT NULL,
ADD COLUMN     "course_name_th" VARCHAR(255) NOT NULL;
