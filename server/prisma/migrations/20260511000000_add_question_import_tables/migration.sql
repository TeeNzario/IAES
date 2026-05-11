-- CreateTable
CREATE TABLE "question_import_sessions" (
    "id" TEXT NOT NULL,
    "course_offerings_id" BIGINT NOT NULL,
    "created_by" BIGINT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_question_import_sessions_offering" ON "question_import_sessions"("course_offerings_id");

-- CreateIndex
CREATE INDEX "idx_question_import_sessions_expires" ON "question_import_sessions"("expires_at");

-- CreateTable
CREATE TABLE "question_import_rows" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "row_index" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "choice_1" TEXT NOT NULL,
    "choice_2" TEXT NOT NULL,
    "choice_3" TEXT NOT NULL,
    "choice_4" TEXT NOT NULL,
    "correct_choice" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "knowledge_categories" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_import_rows_session_id_row_index_key" ON "question_import_rows"("session_id", "row_index");

-- CreateIndex
CREATE INDEX "idx_question_import_rows_session" ON "question_import_rows"("session_id");

-- AddForeignKey
ALTER TABLE "question_import_sessions" ADD CONSTRAINT "question_import_sessions_course_offerings_id_fkey" FOREIGN KEY ("course_offerings_id") REFERENCES "course_offerings"("course_offerings_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_import_sessions" ADD CONSTRAINT "question_import_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "staff_users"("staff_users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_import_rows" ADD CONSTRAINT "question_import_rows_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "question_import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
