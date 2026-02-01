/*
  Warnings:

  - Added the required column `created_by_instructors_id` to the `courses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "created_by_instructors_id" BIGINT NOT NULL;
