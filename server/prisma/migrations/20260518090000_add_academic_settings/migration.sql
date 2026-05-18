CREATE TABLE "academic_settings" (
  "id" SMALLINT NOT NULL DEFAULT 1,
  "academic_year" INTEGER NOT NULL,
  "semester" SMALLINT NOT NULL,
  "updated_by_staff_id" BIGINT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "academic_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academic_settings_singleton_chk" CHECK ("id" = 1),
  CONSTRAINT "academic_settings_year_chk" CHECK ("academic_year" BETWEEN 2000 AND 2200),
  CONSTRAINT "academic_settings_semester_chk" CHECK ("semester" IN (1, 2, 3))
);

ALTER TABLE "academic_settings"
  ADD CONSTRAINT "academic_settings_updated_by_staff_id_fkey"
  FOREIGN KEY ("updated_by_staff_id")
  REFERENCES "staff_users"("staff_users_id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

INSERT INTO "academic_settings" ("id", "academic_year", "semester")
VALUES (
  1,
  COALESCE(
    (
      SELECT "academic_year"
      FROM "course_offerings"
      WHERE "academic_year" BETWEEN 2000 AND 2200
      ORDER BY "academic_year" DESC, "semester" DESC
      LIMIT 1
    ),
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  ),
  COALESCE(
    (
      SELECT "semester"
      FROM "course_offerings"
      WHERE "academic_year" BETWEEN 2000 AND 2200
      ORDER BY "academic_year" DESC, "semester" DESC
      LIMIT 1
    ),
    1
  )
)
ON CONFLICT ("id") DO NOTHING;
