import type { Document, Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import type {
  DocumentAnalysisResponse,
  DocumentDetailResponse,
  DocumentListPageResponse,
  DocumentSummaryResponse,
} from '../types/document.js';

export type DocumentTypeFilter = 'pdf' | 'docx' | 'image' | 'txt';

export interface DocumentListFilters {
  q?: string;
  type?: DocumentTypeFilter;
  /** One or more topics; documents matching any selected topic are returned. */
  topics?: string[];
  page?: number;
  limit?: number;
}

export const DEFAULT_DOCUMENT_PAGE = 1;
export const DEFAULT_DOCUMENT_LIMIT = 20;
export const MAX_DOCUMENT_LIMIT = 100;

type DocumentListRow = Document & {
  analysis: {
    summary: string;
    topics: string[];
  } | null;
};

type DocumentDetailRow = Document & {
  content: {
    text: string;
    wordCount: number;
  } | null;
  analysis: {
    summary: string;
    topics: string[];
    entities: unknown;
    extractedData: unknown;
    createdAt: Date;
  } | null;
};

const listInclude = {
  analysis: {
    select: {
      summary: true,
      topics: true,
    },
  },
} as const;

/**
 * Lists documents with optional search + type/topic filters and pagination.
 */
export async function listDocuments(
  filters: DocumentListFilters = {},
): Promise<DocumentListPageResponse> {
  const page = normalizePage(filters.page);
  const limit = normalizeLimit(filters.limit);
  const where = await buildDocumentWhere(filters);

  const [total, documents] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: listInclude,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    documents: documents.map(serializeDocumentSummary),
    page,
    limit,
    total,
    totalPages,
  };
}

/**
 * @deprecated Prefer listDocuments({ q }). Kept for /documents/search compatibility.
 */
export async function searchDocuments(query: string): Promise<DocumentListPageResponse> {
  return listDocuments({ q: query });
}

function normalizePage(page?: number): number {
  if (!page || !Number.isFinite(page) || page < 1) {
    return DEFAULT_DOCUMENT_PAGE;
  }

  return Math.floor(page);
}

function normalizeLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit) || limit < 1) {
    return DEFAULT_DOCUMENT_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_DOCUMENT_LIMIT);
}

/**
 * Distinct AI topics across all analyses, for filter chips.
 */
export async function listDocumentTopics(): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ topic: string }>>`
    SELECT DISTINCT topic
    FROM "DocumentAnalysis" a,
    LATERAL unnest(a.topics) AS topic
    WHERE topic <> ''
    ORDER BY topic ASC
  `;

  return rows.map((row) => row.topic);
}

async function buildDocumentWhere(
  filters: DocumentListFilters,
): Promise<Prisma.DocumentWhereInput> {
  const clauses: Prisma.DocumentWhereInput[] = [];

  const typeClause = buildTypeWhere(filters.type);
  if (typeClause) {
    clauses.push(typeClause);
  }

  const topicClause = buildTopicWhere(filters.topics);
  if (topicClause) {
    clauses.push(topicClause);
  }

  const searchClause = await buildSearchWhere(filters.q);
  if (searchClause) {
    clauses.push(searchClause);
  }

  if (clauses.length === 0) {
    return {};
  }

  if (clauses.length === 1) {
    return clauses[0] ?? {};
  }

  return { AND: clauses };
}

function buildTypeWhere(type?: DocumentTypeFilter): Prisma.DocumentWhereInput | null {
  if (!type) {
    return null;
  }

  switch (type) {
    case 'pdf':
      return {
        OR: [
          { mimeType: 'application/pdf' },
          { originalName: { endsWith: '.pdf', mode: 'insensitive' } },
        ],
      };
    case 'docx':
      return {
        OR: [
          {
            mimeType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
          { originalName: { endsWith: '.docx', mode: 'insensitive' } },
        ],
      };
    case 'image':
      return {
        OR: [
          { mimeType: { startsWith: 'image/' } },
          { originalName: { endsWith: '.png', mode: 'insensitive' } },
          { originalName: { endsWith: '.jpg', mode: 'insensitive' } },
          { originalName: { endsWith: '.jpeg', mode: 'insensitive' } },
          { originalName: { endsWith: '.webp', mode: 'insensitive' } },
          { originalName: { endsWith: '.gif', mode: 'insensitive' } },
        ],
      };
    case 'txt':
      return {
        OR: [
          { mimeType: 'text/plain' },
          { originalName: { endsWith: '.txt', mode: 'insensitive' } },
        ],
      };
    default:
      return null;
  }
}

function buildTopicWhere(topics?: string[]): Prisma.DocumentWhereInput | null {
  const normalized = (topics ?? []).map((topic) => topic.trim()).filter(Boolean);

  if (normalized.length === 0) {
    return null;
  }

  // Exact topic match (as stored). Multi-select = OR (hasSome).
  return {
    analysis: {
      is: {
        topics: { hasSome: normalized },
      },
    },
  };
}

async function buildSearchWhere(query?: string): Promise<Prisma.DocumentWhereInput | null> {
  const q = query?.trim() ?? '';

  if (!q) {
    return null;
  }

  const topicMatches = await prisma.$queryRaw<Array<{ documentId: string }>>`
    SELECT a."documentId"
    FROM "DocumentAnalysis" a,
    LATERAL unnest(a.topics) AS topic
    WHERE topic ILIKE ${`%${q}%`}
  `;

  const topicMatchedIds = topicMatches.map((row) => row.documentId);

  return {
    OR: [
      { originalName: { contains: q, mode: 'insensitive' } },
      {
        analysis: {
          is: {
            summary: { contains: q, mode: 'insensitive' },
          },
        },
      },
      ...(topicMatchedIds.length > 0 ? [{ id: { in: topicMatchedIds } }] : []),
    ],
  };
}

/**
 * Loads a single document with full content and analysis for the detail page.
 */
export async function getDocumentById(id: string): Promise<DocumentDetailResponse> {
  const document = await prisma.document.findUnique({
    where: { id },
    include: { content: true, analysis: true },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  return serializeDocumentDetail(document);
}

/**
 * Loads file metadata needed to stream a stored upload.
 */
export async function getDocumentFileMeta(id: string): Promise<{
  originalName: string;
  storedName: string;
  mimeType: string;
}> {
  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      originalName: true,
      storedName: true,
      mimeType: true,
    },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  return document;
}

function serializeDocumentSummary(document: DocumentListRow): DocumentSummaryResponse {
  return {
    id: document.id,
    originalName: document.originalName,
    mimeType: document.mimeType,
    uploadedAt: document.uploadedAt.toISOString(),
    analysis: document.analysis
      ? {
          summary: document.analysis.summary,
          topics: document.analysis.topics,
        }
      : null,
  };
}

function serializeDocumentDetail(document: DocumentDetailRow): DocumentDetailResponse {
  if (!document.content) {
    throw new NotFoundError('Document content not found');
  }

  return {
    document: {
      id: document.id,
      filename: document.originalName,
      mimeType: document.mimeType,
      fileSize: Number(document.fileSize),
      uploadedAt: document.uploadedAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    },
    content: {
      text: document.content.text,
      wordCount: document.content.wordCount,
    },
    analysis: document.analysis ? serializeDocumentAnalysis(document.analysis) : null,
  };
}

function serializeDocumentAnalysis(
  analysis: NonNullable<DocumentDetailRow['analysis']>,
): DocumentAnalysisResponse {
  return {
    summary: analysis.summary,
    topics: analysis.topics,
    entities: normalizeStringArray(analysis.entities),
    extractedData: normalizeExtractedData(analysis.extractedData),
    createdAt: analysis.createdAt.toISOString(),
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeExtractedData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}
