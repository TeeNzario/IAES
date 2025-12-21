/*
  Warnings:

  - You are about to drop the column `password_hash` on the `student_directory` table. All the data in the column will be lost.
  - Added the required column `password_hash` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "student_directory" DROP COLUMN "password_hash";

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "password_hash" TEXT NOT NULL;
