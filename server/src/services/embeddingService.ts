import { TaskType } from '@google/generative-ai';
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  VECTOR_STORAGE_DIMENSIONS,
} from '../config/gemini.js';
import { env } from '../config/env.js';
import { AiServiceError, ValidationError } from '../lib/errors.js';
import { getGeminiModel, withGeminiErrorHandling } from '../lib/gemini.js';
import { logger } from '../lib/logger.js';

/** Dense float vector produced by the Gemini embedding model. */
export type EmbeddingVector = number[];

export interface EmbedTextOptions {
  /**
   * Downstream use of the embedding. Use RETRIEVAL_DOCUMENT for chunks
   * and RETRIEVAL_QUERY for search queries.
   */
  taskType?: TaskType;
  /** Optional document title — improves RETRIEVAL_DOCUMENT quality when set. */
  title?: string;
  /**
   * When true, truncate + L2-normalize to VECTOR_STORAGE_DIMENSIONS for pgvector.
   * Always use the same flag for both indexed chunks and search queries.
   */
  forStorage?: boolean;
}

export interface EmbeddingResult {
  embedding: EmbeddingVector;
  dimensions: number;
  model: string;
}

/**
 * Converts a single text chunk into an embedding vector via Gemini.
 * Controllers/services should call this — they must not talk to Gemini directly.
 */
export async function embedText(
  text: string,
  options: EmbedTextOptions = {},
): Promise<EmbeddingResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new ValidationError('Text is required to generate an embedding');
  }

  const modelName = env.GEMINI_EMBEDDING_MODEL || DEFAULT_GEMINI_EMBEDDING_MODEL;
  const taskType = options.taskType ?? TaskType.RETRIEVAL_DOCUMENT;
  const model = getGeminiModel({ model: modelName });

  const rawEmbedding = await withGeminiErrorHandling(async () => {
    const response = await model.embedContent({
      content: { role: 'user', parts: [{ text: trimmed }] },
      taskType,
      ...(options.title ? { title: options.title } : {}),
    });

    return extractEmbeddingValues(response.embedding?.values);
  }, 'Embedding generation');

  const embedding = options.forStorage
    ? prepareStorageEmbedding(rawEmbedding)
    : rawEmbedding;

  logger.debug(
    { model: modelName, dimensions: embedding.length, taskType },
    'Generated embedding',
  );

  return {
    embedding,
    dimensions: embedding.length,
    model: modelName,
  };
}

/**
 * Embeds many chunks efficiently with Gemini batchEmbedContents.
 * Preserves input order in the returned array.
 */
export async function embedTexts(
  texts: string[],
  options: EmbedTextOptions = {},
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) {
    return [];
  }

  const trimmed = texts.map((text) => text.trim());

  if (trimmed.some((text) => !text)) {
    throw new ValidationError('All texts must be non-empty to generate embeddings');
  }

  const modelName = env.GEMINI_EMBEDDING_MODEL || DEFAULT_GEMINI_EMBEDDING_MODEL;
  const taskType = options.taskType ?? TaskType.RETRIEVAL_DOCUMENT;
  const model = getGeminiModel({ model: modelName });

  const rawEmbeddings = await withGeminiErrorHandling(async () => {
    const response = await model.batchEmbedContents({
      requests: trimmed.map((text) => ({
        content: { role: 'user', parts: [{ text }] },
        taskType,
        ...(options.title ? { title: options.title } : {}),
      })),
    });

    const values = response.embeddings ?? [];

    if (values.length !== trimmed.length) {
      throw new AiServiceError('AI returned an unexpected number of embeddings', {
        code: 'AI_RESPONSE_ERROR',
        cause: `expected ${trimmed.length}, got ${values.length}`,
      });
    }

    return values.map((item) => extractEmbeddingValues(item.values));
  }, 'Batch embedding generation');

  const embeddings = options.forStorage
    ? rawEmbeddings.map((values) => prepareStorageEmbedding(values))
    : rawEmbeddings;

  logger.debug(
    { model: modelName, count: embeddings.length, taskType },
    'Generated batch embeddings',
  );

  return embeddings.map((embedding) => ({
    embedding,
    dimensions: embedding.length,
    model: modelName,
  }));
}

/** Convenience for indexing document chunks (RETRIEVAL_DOCUMENT). */
export async function embedDocumentChunk(
  chunkText: string,
  title?: string,
): Promise<EmbeddingResult> {
  return embedText(chunkText, {
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    forStorage: true,
    ...(title ? { title } : {}),
  });
}

/** Convenience for semantic search queries (RETRIEVAL_QUERY). */
export async function embedQuery(query: string): Promise<EmbeddingResult> {
  return embedText(query, {
    taskType: TaskType.RETRIEVAL_QUERY,
    forStorage: true,
  });
}

/**
 * Truncate + L2-normalize to VECTOR_STORAGE_DIMENSIONS (Matryoshka-style).
 * Query and document vectors must both go through this before comparison.
 */
export function prepareStorageEmbedding(
  values: EmbeddingVector,
  dimensions: number = VECTOR_STORAGE_DIMENSIONS,
): EmbeddingVector {
  if (values.length < dimensions) {
    throw new ValidationError(
      `Embedding has ${values.length} dimensions; need at least ${dimensions} for storage`,
    );
  }

  return l2Normalize(values.slice(0, dimensions));
}

/** pgvector literal form: [0.1,0.2,...] */
export function toPgVectorLiteral(embedding: EmbeddingVector): string {
  if (embedding.length === 0) {
    throw new ValidationError('Cannot format an empty embedding for PostgreSQL');
  }

  if (embedding.some((value) => !Number.isFinite(value))) {
    throw new ValidationError('Embedding contains non-finite values');
  }

  return `[${embedding.join(',')}]`;
}

export {
  TaskType,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  VECTOR_STORAGE_DIMENSIONS,
};

function extractEmbeddingValues(values: number[] | undefined): EmbeddingVector {
  if (!values || values.length === 0) {
    throw new AiServiceError('AI returned an empty embedding vector', {
      code: 'AI_RESPONSE_ERROR',
    });
  }

  if (values.some((value) => typeof value !== 'number' || Number.isNaN(value))) {
    throw new AiServiceError('AI returned a malformed embedding vector', {
      code: 'AI_RESPONSE_ERROR',
    });
  }

  return values;
}

function l2Normalize(values: EmbeddingVector): EmbeddingVector {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));

  if (norm === 0) {
    return values;
  }

  return values.map((value) => value / norm);
}
