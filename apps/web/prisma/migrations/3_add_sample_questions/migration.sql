-- CreateTable: sample_questions
CREATE TABLE "sample_questions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sample_questions_document_id_idx" ON "sample_questions"("document_id");

ALTER TABLE "sample_questions" ADD CONSTRAINT "sample_questions_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
