import { ValidationError } from '../lib/errors.js';

/**
 * Smaller windows improve clause-level retrieval for contracts and policies.
 * ~200 words ≈ 250–300 tokens — precise enough for RAG without losing sentence context.
 */
export const DEFAULT_CHUNK_SIZE_WORDS = 200;

/** Shared words between consecutive chunks so boundary context is not lost. */
export const DEFAULT_CHUNK_OVERLAP_WORDS = 40;

export interface TextChunk {
  /** Zero-based order within the document (maps to DocumentChunk.chunkIndex). */
  chunkIndex: number;
  text: string;
  wordCount: number;
  /** 1-based page number when page markers are present in the source text. */
  pageNumber?: number;
}

export interface ChunkDocumentOptions {
  /** Max words per chunk (must be > overlap). Default: 200. */
  chunkSizeWords?: number;
  /** Words reused from the end of the previous chunk. Default: 40. */
  overlapWords?: number;
}

interface PageSegment {
  pageNumber?: number;
  text: string;
}

/**
 * Splits extracted document text into ordered word-window chunks for RAG embeddings.
 *
 * When the text includes page markers (`\\f` or `<!--page:N-->`), chunks keep a
 * `pageNumber` for citations. Does not persist — callers write DocumentChunk rows.
 */
export function chunkDocumentText(
  documentText: string,
  options: ChunkDocumentOptions = {},
): TextChunk[] {
  const chunkSizeWords = options.chunkSizeWords ?? DEFAULT_CHUNK_SIZE_WORDS;
  const overlapWords = options.overlapWords ?? DEFAULT_CHUNK_OVERLAP_WORDS;

  assertValidChunkOptions(chunkSizeWords, overlapWords);

  const pages = splitIntoPages(documentText);
  const chunks: TextChunk[] = [];

  for (const page of pages) {
    const pageChunks = chunkWords(page.text, chunkSizeWords, overlapWords);

    for (const pageChunk of pageChunks) {
      chunks.push({
        chunkIndex: chunks.length,
        text: pageChunk.text,
        wordCount: pageChunk.wordCount,
        ...(page.pageNumber !== undefined ? { pageNumber: page.pageNumber } : {}),
      });
    }
  }

  return chunks;
}

/**
 * Convenience for callers that want 1-based labels (e.g. citations / UI).
 * Persistence should keep using zero-based `chunkIndex`.
 */
export function toOneBasedChunkLabel(chunkIndex: number): number {
  return chunkIndex + 1;
}

function splitIntoPages(documentText: string): PageSegment[] {
  const trimmed = documentText.trim();

  if (!trimmed) {
    return [];
  }

  const markerPattern = /<!--\s*page\s*:\s*(\d+)\s*-->/gi;
  const hasMarkers = markerPattern.test(trimmed);
  markerPattern.lastIndex = 0;

  if (hasMarkers) {
    const segments: PageSegment[] = [];
    const parts = trimmed.split(markerPattern);

    // split with capturing group => [preamble, pageNum, text, pageNum, text, ...]
    for (let i = 1; i < parts.length; i += 2) {
      const pageNumber = Number.parseInt(parts[i] ?? '', 10);
      const text = (parts[i + 1] ?? '').replace(/\f/g, ' ').trim();

      if (!text || !Number.isFinite(pageNumber)) {
        continue;
      }

      segments.push({ pageNumber, text });
    }

    if (segments.length > 0) {
      return segments;
    }
  }

  if (trimmed.includes('\f')) {
    return trimmed
      .split('\f')
      .map((part, index) => ({
        pageNumber: index + 1,
        text: part.trim(),
      }))
      .filter((part) => part.text.length > 0);
  }

  return [{ text: trimmed }];
}

function chunkWords(
  text: string,
  chunkSizeWords: number,
  overlapWords: number,
): Array<{ text: string; wordCount: number }> {
  const words = tokenizeWords(text);

  if (words.length === 0) {
    return [];
  }

  const step = chunkSizeWords - overlapWords;
  const chunks: Array<{ text: string; wordCount: number }> = [];

  for (let start = 0; start < words.length; start += step) {
    const end = Math.min(start + chunkSizeWords, words.length);
    const slice = words.slice(start, end);
    const chunkText = slice.join(' ').trim();

    if (!chunkText) {
      break;
    }

    chunks.push({
      text: chunkText,
      wordCount: slice.length,
    });

    if (end >= words.length) {
      break;
    }
  }

  return chunks;
}

function tokenizeWords(text: string): string[] {
  const trimmed = text.trim();

  if (!trimmed) {
    return [];
  }

  return trimmed.split(/\s+/).filter(Boolean);
}

function assertValidChunkOptions(chunkSizeWords: number, overlapWords: number): void {
  if (!Number.isInteger(chunkSizeWords) || chunkSizeWords < 1) {
    throw new ValidationError('chunkSizeWords must be a positive integer');
  }

  if (!Number.isInteger(overlapWords) || overlapWords < 0) {
    throw new ValidationError('overlapWords must be a non-negative integer');
  }

  if (overlapWords >= chunkSizeWords) {
    throw new ValidationError('overlapWords must be smaller than chunkSizeWords');
  }
}
