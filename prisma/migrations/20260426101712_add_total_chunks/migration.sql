-- DropIndex
DROP INDEX "chunks_content_trgm_idx";

-- DropIndex
DROP INDEX "chunks_embedding_idx";

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "total_chunks" INTEGER;
