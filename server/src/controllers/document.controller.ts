import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import type { Document } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { uploadDir } from '../middleware/upload.middleware.js';
import { parseDocument } from '../services/documentParserService.js';
import type {
  DocumentDetailResponse,
  DocumentRecordResponse,
  DocumentSummaryResponse,
} from '../types/document.js';

type DocumentWithContent = Document & {
  content: {
    text: string;
    wordCount: number;
  } | null;
};

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

function serializeDocumentSummary(document: Document): DocumentSummaryResponse {
  return {
    id: document.id,
    originalName: document.originalName,
    uploadedAt: document.uploadedAt.toISOString(),
  };
}

function serializeDocumentDetail(document: DocumentWithContent): DocumentDetailResponse {
  if (!document.content) {
    throw new NotFoundError('Document content not found');
  }

  return {
    id: document.id,
    filename: document.originalName,
    mimeType: document.mimeType,
    fileSize: Number(document.fileSize),
    uploadedAt: document.uploadedAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    wordCount: document.content.wordCount,
    text: document.content.text,
  };
}

function getRouteParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === 'string') {
    return value;
  }

  throw new ValidationError(`Invalid ${name}`);
}

export async function listDocuments(_req: Request, res: Response): Promise<void> {
  const documents = await prisma.document.findMany({
    orderBy: { uploadedAt: 'desc' },
  });

  res.status(200).json(documents.map(serializeDocumentSummary));
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req.params.id, 'document id');

  const document = await prisma.document.findUnique({
    where: { id },
    include: { content: true },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  res.status(200).json({
    success: true,
    data: serializeDocumentDetail(document),
  });
}

export async function serveDocumentFile(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req.params.id, 'document id');

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

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

    const document = await prisma.document.create({
      data: {
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
        content: {
          create: {
            text: parsed.text,
            wordCount: parsed.wordCount,
          },
        },
      },
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
