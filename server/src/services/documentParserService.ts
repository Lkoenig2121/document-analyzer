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
  const wordCount = countWords(stripPageMarkers(text));

  if (wordCount === 0) {
    throw new DocumentParseError(
      'No readable text could be extracted from this file. Try a text-based PDF, DOCX, or a clearer scan.',
      { filePath, documentType },
    );
  }

  return {
    text,
    wordCount,
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
 * Image-only / scanned PDFs fall back to page screenshots + Tesseract OCR.
 * Preserves page boundaries with `<!--page:N-->` markers for RAG citations.
 */
async function parsePdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText({ pageJoiner: '' });
    let text = '';

    if (Array.isArray(result.pages) && result.pages.length > 0) {
      text = result.pages
        .map((page) => {
          const pageNumber = page.num || 0;
          const pageText = normalizeText(stripPdfParseNoise(page.text));
          if (!pageText || pageNumber < 1) {
            return '';
          }
          return `<!--page:${pageNumber}-->\n${pageText}`;
        })
        .filter(Boolean)
        .join('\n\f\n');
    } else {
      text = normalizeText(stripPdfParseNoise(result.text));
    }

    if (isMeaningfulText(text)) {
      return text;
    }

    logger.info({ filePath }, 'PDF has no embedded text; falling back to OCR');
    return await ocrPdfPages(parser, filePath);
  } catch (error) {
    if (error instanceof DocumentParseError) {
      throw error;
    }

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
 * Renders each PDF page and runs Tesseract OCR.
 * Used when the PDF has no selectable text layer (common for designed resumes).
 */
async function ocrPdfPages(parser: PDFParse, filePath: string): Promise<string> {
  const screenshots = await parser.getScreenshot({
    imageBuffer: true,
    imageDataUrl: false,
    scale: 2,
  });

  const pages = screenshots.pages ?? [];
  if (pages.length === 0) {
    throw new DocumentParseError('PDF has no pages to OCR', { filePath });
  }

  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;

  try {
    worker = await createWorker('eng');
    const parts: string[] = [];

    for (const page of pages) {
      if (!page.data || page.data.length === 0) {
        continue;
      }

      const image = Buffer.from(page.data);
      const result = await worker.recognize(image);
      const pageText = normalizeText(result.data.text);

      if (!pageText || page.pageNumber < 1) {
        continue;
      }

      parts.push(`<!--page:${page.pageNumber}-->\n${pageText}`);
    }

    const text = parts.join('\n\f\n');
    if (!isMeaningfulText(text)) {
      throw new DocumentParseError('OCR could not extract readable text from this PDF', {
        filePath,
      });
    }

    return text;
  } catch (error) {
    if (error instanceof DocumentParseError) {
      throw error;
    }

    logger.error({ err: error, filePath }, 'PDF OCR failed');
    throw new DocumentParseError('Failed to OCR PDF pages', {
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
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

/** Removes pdf-parse page footers like `-- 1 of 1 --` that are not document content. */
function stripPdfParseNoise(text: string): string {
  return text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '');
}

/** Strips RAG page markers before word-count / emptiness checks. */
function stripPageMarkers(text: string): string {
  return text.replace(/<!--page:\d+-->/g, '').replace(/\f/g, '');
}

/** True when extracted text has enough real words to be useful for analysis/RAG. */
function isMeaningfulText(text: string): boolean {
  return countWords(stripPageMarkers(stripPdfParseNoise(text))) >= 5;
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
