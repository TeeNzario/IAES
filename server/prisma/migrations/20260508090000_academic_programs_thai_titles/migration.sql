-- Store real curriculum codes. Several real codes exceed PostgreSQL INTEGER.
ALTER TABLE "staff_users"
  ALTER COLUMN "curriculum_id" TYPE VARCHAR(20)
  USING COALESCE("curriculum_id"::text, '6201220601');

ALTER TABLE "students"
  ALTER COLUMN "curriculum_id" TYPE VARCHAR(20)
  USING COALESCE("curriculum_id"::text, '6201220601');

-- Replace legacy placeholder curriculum IDs with real curriculum codes.
UPDATE "staff_users"
SET "curriculum_id" = CASE "curriculum_id"
  WHEN '1' THEN '6201220601'
  WHEN '2' THEN '6201220401'
  ELSE COALESCE(NULLIF("curriculum_id", ''), '6201220601')
END;

UPDATE "students"
SET "curriculum_id" = CASE "curriculum_id"
  WHEN '1' THEN '6201220601'
  WHEN '2' THEN '6201220401'
  ELSE COALESCE(NULLIF("curriculum_id", ''), '6201220601')
END;

-- Backfill required Thai prefixes before making the columns mandatory.
UPDATE "staff_users"
SET "title" = 'อาจารย์'
WHERE "title" IS NULL OR BTRIM("title") = '' OR "title" IN ('Mr.', 'Ms.', 'Dr.');

UPDATE "students"
SET "title" = CASE
  WHEN "title" IN ('Ms.', 'Miss', 'Mrs.') THEN 'นางสาว'
  ELSE 'นาย'
END
WHERE "title" IS NULL OR BTRIM("title") = '' OR "title" IN ('Mr.', 'Ms.', 'Miss', 'Mrs.');

-- Refresh the original demo accounts/rows in existing local databases.
UPDATE "staff_users"
SET
  "faculty_code" = 18,
  "title" = 'อาจารย์',
  "curriculum_id" = '6201220601',
  "first_name" = 'กิตติ',
  "last_name" = 'ผู้ดูแลระบบ'
WHERE "email" = 'admin@iaes.local';

UPDATE "staff_users"
SET
  "faculty_code" = 18,
  "title" = 'ดร.',
  "curriculum_id" = '6201220601',
  "first_name" = 'อนุชา',
  "last_name" = 'สอนดี'
WHERE "email" = 'instructor@iaes.local';

UPDATE "students"
SET
  "faculty_code" = 18,
  "title" = 'นาย',
  "curriculum_id" = '6201220601',
  "first_name" = 'ธนกฤต',
  "last_name" = 'ใจดี'
WHERE "student_code" = '66131319';

UPDATE "students"
SET
  "faculty_code" = 2,
  "title" = 'นางสาว',
  "curriculum_id" = '6501200111',
  "first_name" = 'ปภาดา',
  "last_name" = 'แก้วมณี'
WHERE "student_code" = '66112233';

UPDATE "students"
SET
  "faculty_code" = 12,
  "title" = 'นาย',
  "curriculum_id" = '6201250151',
  "first_name" = 'ชยพล',
  "last_name" = 'ตั้งใจ'
WHERE "student_code" = '66554433';

UPDATE "students"
SET
  "faculty_code" = 11,
  "title" = 'นางสาว',
  "curriculum_id" = '6201120121',
  "first_name" = 'กานต์พิชชา',
  "last_name" = 'ศรีสุข'
WHERE "student_code" = '66121212';

UPDATE "students"
SET
  "faculty_code" = 1,
  "title" = 'นาย',
  "curriculum_id" = '6201210401',
  "first_name" = 'ภาคิน',
  "last_name" = 'โลจิสติกส์'
WHERE "student_code" = '66131313';

ALTER TABLE "staff_users"
  ALTER COLUMN "title" SET NOT NULL,
  ALTER COLUMN "title" SET DEFAULT 'นาย',
  ALTER COLUMN "curriculum_id" SET NOT NULL,
  ALTER COLUMN "curriculum_id" SET DEFAULT '6201220601';

ALTER TABLE "students"
  ALTER COLUMN "title" SET NOT NULL,
  ALTER COLUMN "title" SET DEFAULT 'นาย',
  ALTER COLUMN "curriculum_id" SET NOT NULL,
  ALTER COLUMN "curriculum_id" SET DEFAULT '6201220601';

-- Preserve prefix/curriculum through the CSV preview workflow.
ALTER TABLE "import_preview_rows"
  ADD COLUMN "title" VARCHAR(50),
  ADD COLUMN "curriculum_id" VARCHAR(20);
