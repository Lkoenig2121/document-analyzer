import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import { env, maxUploadSizeBytes } from '../config/env.js';
import { ValidationError } from '../lib/errors.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);

export const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new ValidationError('Only PDF, DOCX, and TXT files are allowed'));
    return;
  }

  cb(null, true);
}

export const upload = multer({
  storage,
  limits: {
    fileSize: maxUploadSizeBytes,
    files: 1,
  },
  fileFilter,
});

export function handleUploadError(
  err: unknown,
  _req: unknown,
  _res: unknown,
  next: (err?: unknown) => void,
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(
        new ValidationError(`File exceeds maximum size of ${env.MAX_UPLOAD_SIZE_MB}MB`, {
          code: err.code,
        }),
      );
      return;
    }

    next(new ValidationError(err.message, { code: err.code }));
    return;
  }

  next(err);
}
