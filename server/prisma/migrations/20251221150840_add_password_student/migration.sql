/*
  Warnings:

  - Added the required column `password_hash` to the `student_directory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "student_directory" ADD COLUMN     "password_hash" TEXT NOT NULL;
