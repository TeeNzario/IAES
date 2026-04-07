/*
  Warnings:

  - Added the required column `facultyCode` to the `import_preview_rows` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "import_preview_rows" ADD COLUMN     "facultyCode" INTEGER NOT NULL;
