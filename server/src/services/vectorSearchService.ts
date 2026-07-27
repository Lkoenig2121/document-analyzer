import { Prisma } from '../generated/prisma/client.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { chunkDocumentText, type TextChunk } from './chunkingService.js';
import {
  embedQuery,
  embedTexts,
  toPgVectorLiteral,
  type EmbeddingVector,
} from './embeddingService.js';

export const DEFAULT_VECTOR_SEARCH_LIMIT = 5;
export const MAX_VECTOR_SEARCH_LIMIT = 20;

export interface SimilarChunkMatch {
  chunkId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  pageNumber: number | null;
  text: string;
  /** Cosine similarity in [0, 1] (1 = identical direction). */
  similarity: number;
}

export interface SearchSimilarChunksOptions {
  /** Max matches to return. Default: 5. */
  limit?: number;
  /** Restrict search to a single document. */
  documentId?: string;
  /** Drop matches below this cosine similarity (0–1). */
  minSimilarity?: number;
}

export interface IndexDocumentChunksOptions {
  documentId: string;
  /** Pre-chunked text. If omitted, `text` is required and will be chunked. */
  chunks?: TextChunk[];
  /** Full document text to chunk when `chunks` is not provided. */
  text?: string;
  /** Optional title passed to Gemini RETRIEVAL_DOCUMENT embeddings. */
  title?: string;
  /** Replace existing chunks for this document before indexing. Default: true. */
  replaceExisting?: boolean;
}

export interface IndexDocumentChunksResult {
  documentId: string;
  chunkCount: number;
}

type SimilarChunkRow = {
  chunkId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  pageNumber: number | null;
  text: string;
  similarity: number;
};

/**
 * Question → embedding → pgvector cosine search → top matching chunks.
 */
export async function searchSimilarChunks(
  question: string,
  options: SearchSimilarChunksOptions = {},
): Promise<SimilarChunkMatch[]> {
  const trimmed = question.trim();

  if (!trimmed) {
    throw new ValidationError('Question is required for vector search');
  }

  const limit = normalizeLimit(options.limit);
  const { embedding } = await embedQuery(trimmed);
  const matches = await queryNearestChunks(embedding, {
    limit,
    documentId: options.documentId,
  });

  const minSimilarity = options.minSimilarity;
  const filtered =
    typeof minSimilarity === 'number'
      ? matches.filter((match) => match.similarity >= minSimilarity)
      : matches;

  logger.info(
    {
      questionLength: trimmed.length,
      limit,
      matchCount: filtered.length,
      topSimilarity: filtered[0]?.similarity,
    },
    'Vector search completed',
  );

  return filtered;
}

/**
 * Chunk (optional) → embed → store vectors on DocumentChunk for later search.
 */
export async function indexDocumentChunks(
  options: IndexDocumentChunksOptions,
): Promise<IndexDocumentChunksResult> {
  const { documentId, title, replaceExisting = true } = options;

  if (!documentId.trim()) {
    throw new ValidationError('documentId is required to index chunks');
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, originalName: true },
  });

  if (!document) {
    throw new NotFoundError(`Document not found: ${documentId}`);
  }

  const chunks = resolveChunks(options);

  if (chunks.length === 0) {
    throw new ValidationError('No chunks available to index');
  }

  const embeddingTitle = title ?? document.originalName;
  const embeddingResults = await embedTexts(
    chunks.map((chunk) => chunk.text),
    {
      title: embeddingTitle,
      forStorage: true,
    },
  );

  await prisma.$transaction(async (tx) => {
    if (replaceExisting) {
      await tx.documentChunk.deleteMany({ where: { documentId } });
    }

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i]!;
      const embedding = embeddingResults[i]?.embedding;

      if (!embedding) {
        throw new ValidationError(`Missing embedding for chunkIndex ${chunk.chunkIndex}`);
      }

      const created = await tx.documentChunk.create({
        data: {
          documentId,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          ...(chunk.pageNumber !== undefined ? { pageNumber: chunk.pageNumber } : {}),
        },
        select: { id: true },
      });

      await updateChunkEmbedding(tx, created.id, embedding);
    }
  });

  logger.info(
    { documentId, chunkCount: chunks.length },
    'Indexed document chunks with embeddings',
  );

  return { documentId, chunkCount: chunks.length };
}

async function queryNearestChunks(
  embedding: EmbeddingVector,
  options: { limit: number; documentId?: string },
): Promise<SimilarChunkMatch[]> {
  const vectorSql = toVectorSql(embedding);
  const documentFilter = options.documentId
    ? Prisma.sql`AND c."documentId" = ${options.documentId}`
    : Prisma.empty;

  // Cosine distance (`<=>`); similarity = 1 - distance.
  const rows = await prisma.$queryRaw<SimilarChunkRow[]>`
    SELECT
      c.id AS "chunkId",
      c."documentId" AS "documentId",
      d."originalName" AS "documentName",
      c."chunkIndex" AS "chunkIndex",
      c."pageNumber" AS "pageNumber",
      c.text AS "text",
      (1 - (c.embedding <=> ${vectorSql}))::float8 AS similarity
    FROM "DocumentChunk" c
    INNER JOIN "Document" d ON d.id = c."documentId"
    WHERE c.embedding IS NOT NULL
    ${documentFilter}
    ORDER BY c.embedding <=> ${vectorSql}
    LIMIT ${options.limit}
  `;

  return rows.map((row) => ({
    chunkId: row.chunkId,
    documentId: row.documentId,
    documentName: row.documentName,
    chunkIndex: row.chunkIndex,
    pageNumber: row.pageNumber === null || row.pageNumber === undefined ? null : Number(row.pageNumber),
    text: row.text,
    similarity: Number(row.similarity),
  }));
}

async function updateChunkEmbedding(
  tx: Prisma.TransactionClient,
  chunkId: string,
  embedding: EmbeddingVector,
): Promise<void> {
  const vectorSql = toVectorSql(embedding);

  await tx.$executeRaw`
    UPDATE "DocumentChunk"
    SET embedding = ${vectorSql}
    WHERE id = ${chunkId}
  `;
}

function toVectorSql(embedding: EmbeddingVector): Prisma.Sql {
  // Validated numeric literal — safe to inline as a vector cast.
  return Prisma.raw(`'${toPgVectorLiteral(embedding)}'::vector`);
}

function resolveChunks(options: IndexDocumentChunksOptions): TextChunk[] {
  if (options.chunks && options.chunks.length > 0) {
    return options.chunks;
  }

  const text = options.text?.trim() ?? '';

  if (!text) {
    throw new ValidationError('Provide either chunks or text to index');
  }

  return chunkDocumentText(text);
}

function normalizeLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit) || limit < 1) {
    return DEFAULT_VECTOR_SEARCH_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_VECTOR_SEARCH_LIMIT);
}
