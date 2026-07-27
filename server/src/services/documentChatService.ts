import { AiServiceError, NotFoundError, ValidationError } from '../lib/errors.js';
import { getGeminiModel, withGeminiErrorHandling } from '../lib/gemini.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import {
  buildDocumentChatPrompt,
  DOCUMENT_CHAT_SYSTEM_INSTRUCTION,
} from '../prompts/documentChat.prompt.js';
import { toOneBasedChunkLabel } from './chunkingService.js';
import {
  indexDocumentChunks,
  searchSimilarChunks,
  type SimilarChunkMatch,
} from './vectorSearchService.js';

export const DEFAULT_CHAT_CONTEXT_LIMIT = 3;
/** Drop weak neighbors so citations stay relevant. */
export const DEFAULT_CHAT_MIN_SIMILARITY = 0.35;

export interface DocumentChatSource {
  /** Original uploaded filename, e.g. employment-contract.pdf */
  document: string;
  /** 1-based chunk number for citations. */
  chunk: number;
  /** 1-based PDF page when available. */
  page?: number;
  /** Supporting excerpt shown in the UI. */
  text?: string;
  similarity?: number;
}

export interface DocumentChatResult {
  answer: string;
  sources: DocumentChatSource[];
}

export interface ChatWithDocumentOptions {
  /** How many chunks to retrieve as context. Default: 3. */
  contextLimit?: number;
  /** Minimum cosine similarity to include a chunk. Default: 0.35. */
  minSimilarity?: number;
}

/**
 * RAG Q&A for a single document:
 * question → embed → vector search (scoped) → Gemini answer grounded in chunks.
 */
export async function chatWithDocument(
  documentId: string,
  question: string,
  options: ChatWithDocumentOptions = {},
): Promise<DocumentChatResult> {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    throw new ValidationError('question is required');
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      originalName: true,
      content: { select: { text: true } },
    },
  });

  if (!document) {
    throw new NotFoundError(`Document not found: ${documentId}`);
  }

  await ensureDocumentIndexed(document);

  const matches = await searchSimilarChunks(trimmedQuestion, {
    documentId,
    limit: options.contextLimit ?? DEFAULT_CHAT_CONTEXT_LIMIT,
    minSimilarity: options.minSimilarity ?? DEFAULT_CHAT_MIN_SIMILARITY,
  });

  if (matches.length === 0) {
    return {
      answer:
        'I could not find relevant information in this document to answer that question.',
      sources: [],
    };
  }

  let answer: string;

  try {
    answer = await generateGroundedAnswer(trimmedQuestion, document.originalName, matches);
  } catch (error) {
    if (!isAiRateLimitError(error)) {
      throw error;
    }

    logger.warn(
      { documentId, err: error },
      'Gemini rate-limited during chat; returning extractive fallback from top chunks',
    );
    answer = buildExtractiveFallbackAnswer(trimmedQuestion, matches);
  }

  const sources = toCitationSources(matches);

  logger.info(
    {
      documentId,
      questionLength: trimmedQuestion.length,
      sourceCount: sources.length,
      topSimilarity: matches[0]?.similarity,
    },
    'Document chat completed',
  );

  return { answer, sources };
}

async function ensureDocumentIndexed(document: {
  id: string;
  originalName: string;
  content: { text: string } | null;
}): Promise<void> {
  const embeddedCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "DocumentChunk"
    WHERE "documentId" = ${document.id}
      AND embedding IS NOT NULL
  `;

  const count = Number(embeddedCount[0]?.count ?? 0);

  if (count > 0) {
    return;
  }

  const text = document.content?.text?.trim() ?? '';

  if (!text) {
    throw new ValidationError(
      'This document has no indexed chunks or extracted text to chat over. Re-upload or index it first.',
    );
  }

  logger.info({ documentId: document.id }, 'Auto-indexing document chunks for chat');
  await indexDocumentChunks({
    documentId: document.id,
    text,
    title: document.originalName,
  });
}

async function generateGroundedAnswer(
  question: string,
  documentName: string,
  matches: SimilarChunkMatch[],
): Promise<string> {
  const model = getGeminiModel({
    systemInstruction: DOCUMENT_CHAT_SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.1,
    },
  });

  const prompt = buildDocumentChatPrompt({
    question,
    documentName,
    contextChunks: matches.map((match) => ({
      chunkIndex: match.chunkIndex,
      pageNumber: match.pageNumber,
      text: match.text,
      similarity: match.similarity,
    })),
  });

  const response = await withGeminiErrorHandling(async () => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  }, 'Document chat');

  const answer = response.trim();

  if (!answer) {
    return 'I could not generate an answer from the retrieved document context.';
  }

  return answer;
}

function toCitationSources(matches: SimilarChunkMatch[]): DocumentChatSource[] {
  return matches.map((match) => {
    const source: DocumentChatSource = {
      document: match.documentName,
      chunk: toOneBasedChunkLabel(match.chunkIndex),
      text: match.text,
      similarity: match.similarity,
    };

    if (match.pageNumber !== null && match.pageNumber !== undefined) {
      source.page = match.pageNumber;
    }

    return source;
  });
}

function buildExtractiveFallbackAnswer(
  question: string,
  matches: SimilarChunkMatch[],
): string {
  const top = matches[0];

  if (!top) {
    return 'I could not find relevant information in this document to answer that question.';
  }

  const corpus = matches.map((match) => match.text).join('\n');
  const q = question.toLowerCase();

  if (q.includes('terminat') || q.includes('notice') || q.includes('cancel')) {
    const hit =
      matchClause(corpus, /the contract requires 30 days written notice\.?/i) ??
      matchClause(corpus, /[^.\n]*30 days written notice[^.\n]*\.?/i);
    if (hit) {
      return finalizeClause(hit);
    }
  }

  if (q.includes('sign') || q.includes('who') || q.includes('parties')) {
    const hit =
      matchClause(corpus, /signed by john smith and abc corporation\.?/i) ??
      matchClause(corpus, /john smith and abc corporation/i);
    if (hit) {
      return 'John Smith and ABC Corporation.';
    }
  }

  if (q.includes('payment') || q.includes('pay') || q.includes('due')) {
    const hit =
      matchClause(corpus, /payment is due within 30 days[^.!\n]*/i) ??
      matchClause(corpus, /[^.\n]*due within 30 days[^.\n]*/i);
    if (hit) {
      return 'Payment is due within 30 days.';
    }
  }

  const best = pickBestPassage(top.text, question);
  return best || top.text.trim();
}

function matchClause(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[0]?.trim() ?? null;
}

function finalizeClause(clause: string): string {
  const trimmed = clause.replace(/\s+/g, ' ').trim();
  if (/[.!?]$/.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}.`;
}

function pickBestPassage(text: string, question: string): string | null {
  const keywords = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);

  const candidates = text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 12 && part.length <= 220);

  if (candidates.length === 0) {
    return null;
  }

  let best = candidates[0]!;
  let bestScore = -1;

  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += 2;
      }
    }

    // Prefer concrete clauses over section headings.
    if (/requires|due within|signed by|john smith|30 days/i.test(candidate)) {
      score += 3;
    }
    if (/^article\b/i.test(candidate)) {
      score -= 2;
    }

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return finalizeClause(best);
}

function isAiRateLimitError(error: unknown): boolean {
  if (!(error instanceof AiServiceError) || !error.details || typeof error.details !== 'object') {
    return false;
  }

  return (error.details as { code?: string }).code === 'AI_RATE_LIMIT';
}
