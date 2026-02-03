/*
  Warnings:

  - You are about to drop the `course_knowledge_maps` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_knowledge_maps` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "course_knowledge_maps" DROP CONSTRAINT "course_knowledge_maps_courses_id_fkey";

-- DropForeignKey
ALTER TABLE "course_knowledge_maps" DROP CONSTRAINT "course_knowledge_maps_knowledge_category_id_fkey";

-- DropForeignKey
ALTER TABLE "question_knowledge_maps" DROP CONSTRAINT "question_knowledge_maps_courses_id_fkey";

-- DropForeignKey
ALTER TABLE "question_knowledge_maps" DROP CONSTRAINT "question_knowledge_maps_knowledge_category_id_fkey";

-- DropForeignKey
ALTER TABLE "question_knowledge_maps" DROP CONSTRAINT "question_knowledge_maps_question_id_fkey";

-- DropTable
DROP TABLE "course_knowledge_maps";

-- DropTable
DROP TABLE "question_knowledge_maps";

-- CreateTable
CREATE TABLE "course_knowledge" (
    "courses_id" BIGINT NOT NULL,
    "knowledge_category_id" BIGINT NOT NULL,

    CONSTRAINT "course_knowledge_pkey" PRIMARY KEY ("courses_id","knowledge_category_id")
);

-- CreateTable
CREATE TABLE "question_knowledge" (
    "question_id" BIGINT NOT NULL,
    "knowledge_category_id" BIGINT NOT NULL,
    "courses_id" BIGINT NOT NULL,

    CONSTRAINT "question_knowledge_pkey" PRIMARY KEY ("question_id","knowledge_category_id","courses_id")
);

-- AddForeignKey
ALTER TABLE "course_knowledge" ADD CONSTRAINT "course_knowledge_courses_id_fkey" FOREIGN KEY ("courses_id") REFERENCES "courses"("courses_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_knowledge" ADD CONSTRAINT "course_knowledge_knowledge_category_id_fkey" FOREIGN KEY ("knowledge_category_id") REFERENCES "knowledge_categories"("knowledge_category_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_knowledge" ADD CONSTRAINT "question_knowledge_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_knowledge" ADD CONSTRAINT "question_knowledge_knowledge_category_id_fkey" FOREIGN KEY ("knowledge_category_id") REFERENCES "knowledge_categories"("knowledge_category_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_knowledge" ADD CONSTRAINT "question_knowledge_courses_id_fkey" FOREIGN KEY ("courses_id") REFERENCES "courses"("courses_id") ON DELETE CASCADE ON UPDATE CASCADE;
