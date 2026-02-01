/*
  Warnings:

  - You are about to drop the `course_announcements` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "course_announcements" DROP CONSTRAINT "course_announcements_course_offerings_id_fkey";

-- DropForeignKey
ALTER TABLE "course_announcements" DROP CONSTRAINT "course_announcements_created_by_staff_id_fkey";

-- DropTable
DROP TABLE "course_announcements";
