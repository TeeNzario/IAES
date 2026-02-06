/*
  Warnings:

  - A unique constraint covering the columns `[courses_id,academic_year,semester]` on the table `course_offerings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "course_offerings_courses_id_academic_year_semester_key" ON "course_offerings"("courses_id", "academic_year", "semester");
