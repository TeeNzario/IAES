/*
  Warnings:

  - You are about to drop the column `cover_image` on the `courses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "courses" DROP COLUMN "cover_image",
ADD COLUMN     "course_image" TEXT;
