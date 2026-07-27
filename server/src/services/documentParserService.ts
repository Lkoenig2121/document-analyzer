import fs from 'node:fs/promises';
import path from 'node:path';
import { extractRawText } from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { DocumentParseError, UnsupportedFileTypeError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export type DocumentType = 'pdf' | 'docx' | 'image' | 'text';

export interface ParseDocumentOptions {
  /** MIME type from upload metadata; used as a hint when the extension is ambiguous. */
  mimeType?: string;
}

export interface ParseDocumentResult {
  text: string;
  wordCount: number;
  documentType: DocumentType;
}

const EXTENSION_TO_TYPE: Record<string, DocumentType> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.txt': 'text',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.webp': 'image',
  '.gif': 'image',
  '.bmp': 'image',
  '.tiff': 'image',
  '.tif': 'image',
};

const MIME_TO_TYPE: Record<string, DocumentType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'text',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',
};

/**
 * Entry point for document parsing.
 *
 * Validates the file exists, detects its type, delegates to a type-specific
 * parser, and returns normalized plain text with a word count.
 */
export async function parseDocument(
  filePath: string,
  options: ParseDocumentOptions = {},
): Promise<ParseDocumentResult> {
  await assertFileExists(filePath);

  const documentType = detectDocumentType(filePath, options.mimeType);
  const text = await extractTextByType(filePath, documentType);

  return {
    text,
    wordCount: countWords(text),
    documentType,
  };
}

/**
 * Resolves a file path to a supported document type using extension first,
 * then MIME type as a fallback hint from the caller.
 */
export function detectDocumentType(filePath: string, mimeType?: string): DocumentType {
  const extension = path.extname(filePath).toLowerCase();
  const typeFromExtension = EXTENSION_TO_TYPE[extension];

  if (typeFromExtension) {
    return typeFromExtension;
  }

  if (mimeType) {
    const typeFromMime = MIME_TO_TYPE[mimeType.toLowerCase()];

    if (typeFromMime) {
      return typeFromMime;
    }
  }

  throw new UnsupportedFileTypeError('Unsupported file type for parsing', {
    extension: extension || null,
    mimeType: mimeType ?? null,
  });
}

async function extractTextByType(filePath: string, documentType: DocumentType): Promise<string> {
  switch (documentType) {
    case 'pdf':
      return parsePdf(filePath);
    case 'docx':
      return parseDocx(filePath);
    case 'image':
      return parseImage(filePath);
    case 'text':
      return parsePlainText(filePath);
    default: {
      const exhaustiveCheck: never = documentType;
      throw new UnsupportedFileTypeError(`No parser registered for type: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Extracts embedded text from a PDF using pdf-parse.
 * Preserves page boundaries with `<!--page:N-->` markers for RAG citations.
 */
async function parsePdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();

    if (Array.isArray(result.pages) && result.pages.length > 0) {
      return result.pages
        .map((page) => {
          const pageNumber = page.num || 0;
          const pageText = normalizeText(page.text);
          if (!pageText || pageNumber < 1) {
            return '';
          }
          return `<!--page:${pageNumber}-->\n${pageText}`;
        })
        .filter(Boolean)
        .join('\n\f\n');
    }

    return normalizeText(result.text);
  } catch (error) {
    logger.error({ err: error, filePath }, 'PDF parsing failed');
    throw new DocumentParseError('Failed to extract text from PDF', {
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    });
  } finally {
    try {
      await parser.destroy();
    } catch {
      // pdf-parse may throw on destroy for some files; text extraction already succeeded.
    }
  }
}

/**
 * Extracts raw text from a DOCX file using mammoth.
 * Raw text is preferred over HTML for downstream AI processing.
 */
async function parseDocx(filePath: string): Promise<string> {
  try {
    const result = await extractRawText({ path: filePath });

    if (result.messages.length > 0) {
      logger.warn({ filePath, messages: result.messages }, 'DOCX parsing produced warnings');
    }

    return normalizeText(result.value);
  } catch (error) {
    logger.error({ err: error, filePath }, 'DOCX parsing failed');
    throw new DocumentParseError('Failed to extract text from DOCX', {
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Runs OCR on an image file using Tesseract.js.
 * Worker lifecycle is scoped to each call; pooling can be added later if needed.
 */
async function parseImage(filePath: string): Promise<string> {
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;

  try {
    worker = await createWorker('eng');
    const result = await worker.recognize(filePath);
    return normalizeText(result.data.text);
  } catch (error) {
    logger.error({ err: error, filePath }, 'Image OCR failed');
    throw new DocumentParseError('Failed to extract text from image', {
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }
}

/** Reads UTF-8 plain text files directly from disk. */
async function parsePlainText(filePath: string): Promise<string> {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return normalizeText(text);
  } catch (error) {
    logger.error({ err: error, filePath }, 'Plain text read failed');
    throw new DocumentParseError('Failed to read plain text file', {
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Trims whitespace and collapses repeated blank lines for consistent downstream input. */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Counts words by splitting on whitespace; returns 0 for empty strings. */
export function countWords(text: string): number {
  const trimmed = text.trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

async function assertFileExists(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      throw new DocumentParseError('Path does not point to a file', { filePath });
    }
  } catch (error) {
    if (error instanceof DocumentParseError) {
      throw error;
    }

    throw new DocumentParseError('File not found or not readable', {
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}
