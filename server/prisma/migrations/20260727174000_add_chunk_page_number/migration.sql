-- Track source page numbers for RAG citations.

ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "pageNumber" INTEGER;
