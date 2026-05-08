-- PostgreSQL cannot move an existing column in place. Rebuild these tables so
-- DB viewers show title immediately before first_name/last_name.

ALTER TABLE "course_instructors" DROP CONSTRAINT "course_instructors_staff_users_id_fkey";
ALTER TABLE "import_preview_sessions" DROP CONSTRAINT "import_preview_sessions_created_by_fkey";
ALTER TABLE "question_bank" DROP CONSTRAINT "question_bank_created_by_staff_id_fkey";
ALTER TABLE "question_bank_years" DROP CONSTRAINT "question_bank_years_created_by_staff_id_fkey";
ALTER TABLE "question_collections" DROP CONSTRAINT "question_collections_created_by_staff_id_fkey";
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_student_code_fkey";
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_student_code_fkey";

ALTER SEQUENCE "staff_users_staff_users_id_seq" OWNED BY NONE;

ALTER TABLE "staff_users" RENAME TO "staff_users_reorder_old";
ALTER INDEX IF EXISTS "staff_users_pkey" RENAME TO "staff_users_reorder_old_pkey";
ALTER INDEX IF EXISTS "staff_users_email_key" RENAME TO "staff_users_reorder_old_email_key";
ALTER INDEX IF EXISTS "idx_staff_users_role" RENAME TO "idx_staff_users_reorder_old_role";

CREATE TABLE "staff_users" (
  "staff_users_id" BIGINT NOT NULL DEFAULT nextval('staff_users_staff_users_id_seq'::regclass),
  "email" VARCHAR(255) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "user_role" NOT NULL,
  "faculty_code" INTEGER NOT NULL,
  "curriculum_id" VARCHAR(20) NOT NULL DEFAULT '6201220601',
  "title" VARCHAR(50) NOT NULL DEFAULT 'นาย',
  "first_name" VARCHAR(100) NOT NULL,
  "last_name" VARCHAR(100) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_users_pkey" PRIMARY KEY ("staff_users_id")
);

INSERT INTO "staff_users" (
  "staff_users_id",
  "email",
  "password_hash",
  "role",
  "faculty_code",
  "curriculum_id",
  "title",
  "first_name",
  "last_name",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  "staff_users_id",
  "email",
  "password_hash",
  "role",
  "faculty_code",
  "curriculum_id",
  "title",
  "first_name",
  "last_name",
  "is_active",
  "created_at",
  "updated_at"
FROM "staff_users_reorder_old";

SELECT setval(
  'staff_users_staff_users_id_seq',
  COALESCE((SELECT MAX("staff_users_id") FROM "staff_users"), 1),
  (SELECT COUNT(*) > 0 FROM "staff_users")
);

DROP TABLE "staff_users_reorder_old";
ALTER SEQUENCE "staff_users_staff_users_id_seq" OWNED BY "staff_users"."staff_users_id";

CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");
CREATE INDEX "idx_staff_users_role" ON "staff_users"("role");

ALTER TABLE "students" RENAME TO "students_reorder_old";
ALTER INDEX IF EXISTS "students_pkey" RENAME TO "students_reorder_old_pkey";
ALTER INDEX IF EXISTS "students_email_key" RENAME TO "students_reorder_old_email_key";

CREATE TABLE "students" (
  "student_code" VARCHAR(50) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "faculty_code" INTEGER NOT NULL,
  "curriculum_id" VARCHAR(20) NOT NULL DEFAULT '6201220601',
  "title" VARCHAR(50) NOT NULL DEFAULT 'นาย',
  "first_name" VARCHAR(100) NOT NULL,
  "last_name" VARCHAR(100) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "students_pkey" PRIMARY KEY ("student_code")
);

INSERT INTO "students" (
  "student_code",
  "email",
  "password_hash",
  "faculty_code",
  "curriculum_id",
  "title",
  "first_name",
  "last_name",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  "student_code",
  "email",
  "password_hash",
  "faculty_code",
  "curriculum_id",
  "title",
  "first_name",
  "last_name",
  "is_active",
  "created_at",
  "updated_at"
FROM "students_reorder_old";

DROP TABLE "students_reorder_old";

CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

ALTER TABLE "course_instructors"
  ADD CONSTRAINT "course_instructors_staff_users_id_fkey"
  FOREIGN KEY ("staff_users_id") REFERENCES "staff_users"("staff_users_id") ON DELETE CASCADE;

ALTER TABLE "import_preview_sessions"
  ADD CONSTRAINT "import_preview_sessions_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "staff_users"("staff_users_id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "question_bank"
  ADD CONSTRAINT "question_bank_created_by_staff_id_fkey"
  FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_users"("staff_users_id") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "question_bank_years"
  ADD CONSTRAINT "question_bank_years_created_by_staff_id_fkey"
  FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_users"("staff_users_id") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "question_collections"
  ADD CONSTRAINT "question_collections_created_by_staff_id_fkey"
  FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_users"("staff_users_id") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "course_enrollments"
  ADD CONSTRAINT "course_enrollments_student_code_fkey"
  FOREIGN KEY ("student_code") REFERENCES "students"("student_code") ON DELETE CASCADE;

ALTER TABLE "exam_attempts"
  ADD CONSTRAINT "exam_attempts_student_code_fkey"
  FOREIGN KEY ("student_code") REFERENCES "students"("student_code") ON UPDATE CASCADE ON DELETE CASCADE;
