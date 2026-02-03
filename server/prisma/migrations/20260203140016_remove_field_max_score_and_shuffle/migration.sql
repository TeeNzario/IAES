/*
  Warnings:

  - You are about to drop the column `max_score` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `shuffle_choice` on the `exam_questions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "exam_questions" DROP COLUMN "max_score",
DROP COLUMN "shuffle_choice";
