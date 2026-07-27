-- Enable pgvector and store 768-d embeddings on document chunks.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embedding" vector(768);

-- Replace existing FK with ON DELETE CASCADE so chunks go away with the document.
ALTER TABLE "DocumentChunk" DROP CONSTRAINT IF EXISTS "DocumentChunk_documentId_fkey";
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentChunk_documentId_chunkIndex_key"
  ON "DocumentChunk"("documentId", "chunkIndex");

CREATE INDEX IF NOT EXISTS "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- Cosine-distance ANN index (optional; exact search still works without it).
CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_cosine_idx"
  ON "DocumentChunk"
  USING hnsw ("embedding" vector_cosine_ops);
