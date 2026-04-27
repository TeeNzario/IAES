-- CreateTable
CREATE TABLE "question_bank_years" (
    "question_bank_year_id" BIGSERIAL NOT NULL,
    "courses_id" BIGINT NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "created_by_staff_id" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_bank_years_pkey" PRIMARY KEY ("question_bank_year_id")
);

-- CreateTable
CREATE TABLE "question_collections" (
    "question_collection_id" BIGSERIAL NOT NULL,
    "question_bank_year_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_by_staff_id" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_collections_pkey" PRIMARY KEY ("question_collection_id")
);

-- CreateIndex
CREATE INDEX "idx_qb_years_course" ON "question_bank_years"("courses_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_bank_years_courses_id_academic_year_key" ON "question_bank_years"("courses_id", "academic_year");

-- CreateIndex
CREATE INDEX "idx_qcollections_year" ON "question_collections"("question_bank_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_collections_question_bank_year_id_title_key" ON "question_collections"("question_bank_year_id", "title");

-- AddForeignKey
ALTER TABLE "question_bank_years" ADD CONSTRAINT "question_bank_years_courses_id_fkey" FOREIGN KEY ("courses_id") REFERENCES "courses"("courses_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_years" ADD CONSTRAINT "question_bank_years_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_users"("staff_users_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_collections" ADD CONSTRAINT "question_collections_question_bank_year_id_fkey" FOREIGN KEY ("question_bank_year_id") REFERENCES "question_bank_years"("question_bank_year_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_collections" ADD CONSTRAINT "question_collections_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_users"("staff_users_id") ON DELETE RESTRICT ON UPDATE CASCADE;
