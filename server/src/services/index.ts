export {
  countWords,
  detectDocumentType,
  parseDocument,
  type DocumentType,
  type ParseDocumentOptions,
  type ParseDocumentResult,
} from './documentParserService.js';

export {
  analyzeDocumentText,
  type DocumentAnalysisResult,
} from './aiAnalysisService.js';

export {
  chunkDocumentText,
  toOneBasedChunkLabel,
  DEFAULT_CHUNK_SIZE_WORDS,
  DEFAULT_CHUNK_OVERLAP_WORDS,
  type TextChunk,
  type ChunkDocumentOptions,
} from './chunkingService.js';

export {
  embedText,
  embedTexts,
  embedDocumentChunk,
  embedQuery,
  prepareStorageEmbedding,
  toPgVectorLiteral,
  TaskType,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  VECTOR_STORAGE_DIMENSIONS,
  type EmbeddingVector,
  type EmbedTextOptions,
  type EmbeddingResult,
} from './embeddingService.js';

export {
  searchSimilarChunks,
  indexDocumentChunks,
  DEFAULT_VECTOR_SEARCH_LIMIT,
  MAX_VECTOR_SEARCH_LIMIT,
  type SimilarChunkMatch,
  type SearchSimilarChunksOptions,
  type IndexDocumentChunksOptions,
  type IndexDocumentChunksResult,
} from './vectorSearchService.js';

export {
  chatWithDocument,
  DEFAULT_CHAT_CONTEXT_LIMIT,
  DEFAULT_CHAT_MIN_SIMILARITY,
  type DocumentChatResult,
  type DocumentChatSource,
  type ChatWithDocumentOptions,
} from './documentChatService.js';

export {
  getDocumentById,
  getDocumentFileMeta,
  listDocumentTopics,
  listDocuments,
  searchDocuments,
  type DocumentListFilters,
  type DocumentTypeFilter,
  DEFAULT_DOCUMENT_LIMIT,
  DEFAULT_DOCUMENT_PAGE,
  MAX_DOCUMENT_LIMIT,
} from './documentService.js';
