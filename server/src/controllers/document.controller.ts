import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import type { Document, Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { ValidationError } from '../lib/errors.js';
import { uploadDir } from '../middleware/upload.middleware.js';
import { analyzeDocumentText } from '../services/aiAnalysisService.js';
import {
  getDocumentById,
  getDocumentFileMeta,
  listDocumentTopics,
  listDocuments as listDocumentsFromService,
  DEFAULT_DOCUMENT_LIMIT,
  DEFAULT_DOCUMENT_PAGE,
  MAX_DOCUMENT_LIMIT,
  type DocumentListFilters,
  type DocumentTypeFilter,
} from '../services/documentService.js';
import { parseDocument } from '../services/documentParserService.js';
import type { DocumentRecordResponse } from '../types/document.js';
import { NotFoundError } from '../lib/errors.js';

const DOCUMENT_TYPE_FILTERS = new Set<DocumentTypeFilter>(['pdf', 'docx', 'image', 'txt']);

function serializeDocument(document: Document): DocumentRecordResponse {
  return {
    id: document.id,
    originalName: document.originalName,
    storedName: document.storedName,
    mimeType: document.mimeType,
    fileSize: Number(document.fileSize),
    uploadedAt: document.uploadedAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function getRouteParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === 'string') {
    return value;
  }

  throw new ValidationError(`Invalid ${name}`);
}

function parseQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseDocumentType(value: unknown): DocumentTypeFilter | undefined {
  const raw = parseQueryString(value)?.toLowerCase();

  if (!raw || raw === 'all') {
    return undefined;
  }

  if (!DOCUMENT_TYPE_FILTERS.has(raw as DocumentTypeFilter)) {
    throw new ValidationError('Invalid document type filter', {
      type: raw,
      allowed: Array.from(DOCUMENT_TYPE_FILTERS),
    });
  }

  return raw as DocumentTypeFilter;
}

function parseTopics(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];
  const topics = values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return topics.length > 0 ? topics : undefined;
}

function parsePositiveInt(value: unknown, fallback: number, max?: number): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  const normalized = Math.floor(parsed);
  return max ? Math.min(normalized, max) : normalized;
}

function parseListFilters(query: Request['query']): DocumentListFilters {
  const filters: DocumentListFilters = {};
  const q = parseQueryString(query.q);
  const type = parseDocumentType(query.type);
  const topics = parseTopics(query.topic);

  if (q) {
    filters.q = q;
  }

  if (type) {
    filters.type = type;
  }

  if (topics) {
    filters.topics = topics;
  }

  filters.page = parsePositiveInt(query.page, DEFAULT_DOCUMENT_PAGE);
  filters.limit = parsePositiveInt(query.limit, DEFAULT_DOCUMENT_LIMIT, MAX_DOCUMENT_LIMIT);

  return filters;
}

export async function listDocuments(req: Request, res: Response): Promise<void> {
  const documents = await listDocumentsFromService(parseListFilters(req.query));
  res.status(200).json(documents);
}

export async function searchDocuments(req: Request, res: Response): Promise<void> {
  const documents = await listDocumentsFromService(parseListFilters(req.query));
  res.status(200).json(documents);
}

export async function listTopics(_req: Request, res: Response): Promise<void> {
  const topics = await listDocumentTopics();
  res.status(200).json(topics);
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req.params.id, 'document id');
  const document = await getDocumentById(id);

  res.status(200).json({
    success: true,
    data: document,
  });
}

export async function serveDocumentFile(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req.params.id, 'document id');
  const document = await getDocumentFileMeta(id);
  const filePath = path.join(uploadDir, document.storedName);

  try {
    await fs.access(filePath);
  } catch {
    throw new NotFoundError('Document file not found');
  }

  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
  res.sendFile(filePath);
}

export async function createDocument(req: Request, res: Response): Promise<void> {
  const file = req.file;

  if (!file) {
    throw new ValidationError('A file is required. Use the "file" field in multipart/form-data.');
  }

  const storedPath = path.join(uploadDir, file.filename);

  try {
    const parsed = await parseDocument(storedPath, { mimeType: file.mimetype });
    const analysis = await analyzeDocumentText(parsed.text);

    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          originalName: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype,
          fileSize: file.size,
        },
      });

      await tx.documentContent.create({
        data: {
          documentId: created.id,
          text: parsed.text,
          wordCount: parsed.wordCount,
        },
      });

      await tx.documentAnalysis.create({
        data: {
          documentId: created.id,
          summary: analysis.summary,
          topics: analysis.topics,
          entities: analysis.entities as Prisma.InputJsonValue,
          extractedData: analysis.extractedData as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    res.status(201).json({
      success: true,
      data: serializeDocument(document),
    });
  } catch (error) {
    await fs.unlink(storedPath).catch(() => undefined);
    throw error;
  }
}
