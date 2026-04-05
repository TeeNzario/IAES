/*
  Warnings:

  - Added the required column `facultyCode` to the `staff_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `facultyCode` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "staff_users" ADD COLUMN     "facultyCode" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "facultyCode" INTEGER NOT NULL;
