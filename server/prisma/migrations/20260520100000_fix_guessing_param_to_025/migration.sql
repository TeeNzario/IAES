ALTER TABLE "question_bank"
DROP CONSTRAINT IF EXISTS "question_bank_irt_params_chk";

UPDATE "question_bank"
SET "guessing_param" = 0.25
WHERE "guessing_param" IS NOT NULL;

ALTER TABLE "question_bank"
ADD CONSTRAINT "question_bank_irt_params_chk" CHECK (
  ("difficulty_param" IS NULL OR "difficulty_param" BETWEEN -3 AND 3)
  AND ("discrimination_param" IS NULL OR "discrimination_param" BETWEEN 0.5 AND 2.5)
  AND ("guessing_param" IS NULL OR "guessing_param" = 0.25)
);
