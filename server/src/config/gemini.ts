/**
 * Default Gemini model when GEMINI_MODEL is not set.
 * Prefer `gemini-flash-latest` over pinned `gemini-2.0-flash` — free-tier quotas
 * on specific model IDs are often exhausted while the rolling alias still works.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

/** Tried in order when the primary model returns rate-limit / not-found errors. */
export const GEMINI_MODEL_FALLBACKS = [
  'gemini-flash-latest',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
] as const;

/**
 * Default embedding model when GEMINI_EMBEDDING_MODEL is not set.
 * gemini-embedding-001 is available on the Gemini Developer API for embedContent.
 * Full output is 3072 dimensions; we store a Matryoshka-truncated 768-d vector in pgvector.
 */
export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

/** Full output dimensionality from gemini-embedding-001. */
export const DEFAULT_EMBEDDING_DIMENSIONS = 3072;

/**
 * Dimensions stored in PostgreSQL (pgvector `vector` indexes well up to 2000).
 * First N dims of gemini-embedding-001 are Matryoshka-compatible after L2 normalize.
 */
export const VECTOR_STORAGE_DIMENSIONS = 768;

/** Shared request timeout for Gemini API calls (milliseconds). */
export const GEMINI_REQUEST_TIMEOUT_MS = 60_000;
