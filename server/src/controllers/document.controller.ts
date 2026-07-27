import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import type { Document } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { uploadDir } from '../middleware/upload.middleware.js';

function serializeDocument(document: Document) {
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

function serializeDocumentSummary(document: Document) {
  return {
    id: document.id,
    originalName: document.originalName,
    uploadedAt: document.uploadedAt.toISOString(),
  };
}

export async function listDocuments(_req: Request, res: Response): Promise<void> {
  const documents = await prisma.document.findMany({
    orderBy: { uploadedAt: 'desc' },
  });

  res.status(200).json(documents.map(serializeDocumentSummary));
}

export async function serveDocumentFile(req: Request, res: Response): Promise<void> {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
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

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const file = req.file;

  if (!file) {
    throw new ValidationError('A file is required. Use the "file" field in multipart/form-data.');
  }

  const storedPath = path.join(uploadDir, file.filename);

  try {
    const document = await prisma.document.create({
      data: {
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
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
