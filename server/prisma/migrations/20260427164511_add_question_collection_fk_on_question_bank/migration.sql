-- AlterTable
ALTER TABLE "question_bank" ADD COLUMN     "question_collection_id" BIGINT;

-- CreateIndex
CREATE INDEX "idx_qbank_collection" ON "question_bank"("question_collection_id");

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_question_collection_id_fkey" FOREIGN KEY ("question_collection_id") REFERENCES "question_collections"("question_collection_id") ON DELETE SET NULL ON UPDATE CASCADE;
