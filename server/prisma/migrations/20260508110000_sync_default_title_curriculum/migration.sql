-- Align Prisma schema with the default values already set on the database
-- by earlier migrations. Idempotent on existing databases.

ALTER TABLE "staff_users"
  ALTER COLUMN "title" SET DEFAULT 'นาย',
  ALTER COLUMN "curriculum_id" SET DEFAULT 'CUR067';

ALTER TABLE "students"
  ALTER COLUMN "title" SET DEFAULT 'นาย',
  ALTER COLUMN "curriculum_id" SET DEFAULT 'CUR067';
