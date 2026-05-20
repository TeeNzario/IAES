ALTER TABLE "course_knowledge" ADD COLUMN "code" VARCHAR(30);

WITH numbered AS (
  SELECT
    "courses_id",
    "knowledge_category_id",
    ROW_NUMBER() OVER (
      PARTITION BY "courses_id"
      ORDER BY "knowledge_category_id"
    ) AS rn
  FROM "course_knowledge"
)
UPDATE "course_knowledge" AS ck
SET "code" = 'K' || LPAD(numbered.rn::text, 3, '0')
FROM numbered
WHERE ck."courses_id" = numbered."courses_id"
  AND ck."knowledge_category_id" = numbered."knowledge_category_id";

ALTER TABLE "course_knowledge" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "course_knowledge" ADD CONSTRAINT "course_knowledge_courses_id_code_key" UNIQUE ("courses_id", "code");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "courses"
    WHERE length("course_code") > 15
      OR length("course_name") > 150
      OR length("course_name_th") > 150
      OR length("course_name_en") > 150
  ) THEN
    RAISE EXCEPTION 'Cannot tighten course length limits because existing course data exceeds the new maximum lengths.';
  END IF;
END $$;

ALTER TABLE "courses" ALTER COLUMN "course_code" TYPE VARCHAR(15);
ALTER TABLE "courses" ALTER COLUMN "course_name" TYPE VARCHAR(150);
ALTER TABLE "courses" ALTER COLUMN "course_name_th" TYPE VARCHAR(150);
ALTER TABLE "courses" ALTER COLUMN "course_name_en" TYPE VARCHAR(150);
