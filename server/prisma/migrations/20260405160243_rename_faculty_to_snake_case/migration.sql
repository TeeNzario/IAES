/*
  Warnings:

  - You are about to drop the column `facultyCode` on the `staff_users` table. All the data in the column will be lost.
  - You are about to drop the column `facultyCode` on the `students` table. All the data in the column will be lost.
  - Added the required column `faculty_code` to the `staff_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `faculty_code` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "staff_users" DROP COLUMN "facultyCode",
ADD COLUMN     "faculty_code" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "facultyCode",
ADD COLUMN     "faculty_code" INTEGER NOT NULL;
