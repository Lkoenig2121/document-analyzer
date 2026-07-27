import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { env } from '../config/env.js';
import { AiServiceError, AppError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Central Express error handler.
 * Maps upload / Gemini / database failures to stable client-facing messages
 * so the API never crashes on operational errors.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const normalized = normalizeError(err);

  if (!normalized.isOperational) {
    logger.error({ err, statusCode: normalized.statusCode }, 'Unhandled error');
  } else {
    logger.warn(
      { err, statusCode: normalized.statusCode, code: normalized.code },
      normalized.message,
    );
  }

  if (res.headersSent) {
    return;
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      message: normalized.message,
      ...(normalized.code ? { code: normalized.code } : {}),
      ...(env.NODE_ENV !== 'production' &&
        normalized.details !== undefined && { details: normalized.details }),
    },
  };

  res.status(normalized.statusCode).json(response);
}

function normalizeError(err: unknown): {
  statusCode: number;
  message: string;
  isOperational: boolean;
  code?: string;
  details?: unknown;
} {
  // --- Upload / validation ---
  if (err instanceof ValidationError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      isOperational: true,
      code: 'UPLOAD_VALIDATION_ERROR',
      details: err.details,
    };
  }

  // --- Gemini / AI ---
  if (err instanceof AiServiceError) {
    return {
      statusCode: err.statusCode,
      message: toAiClientMessage(err),
      isOperational: true,
      code: readErrorCode(err.details) ?? 'AI_SERVICE_ERROR',
      details: env.NODE_ENV !== 'production' ? err.details : undefined,
    };
  }

  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      isOperational: err.isOperational,
      details: err.details,
    };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      isOperational: true,
      code: 'VALIDATION_ERROR',
      details: err.flatten(),
    };
  }

  // --- Database ---
  if (isDatabaseUnavailableError(err)) {
    return {
      statusCode: 503,
      message: 'Database unavailable',
      isOperational: true,
      code: 'DATABASE_UNAVAILABLE',
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      statusCode: mapPrismaErrorStatus(err.code),
      message: 'Database operation failed',
      isOperational: true,
      code: err.code,
    };
  }

  if (err instanceof Error) {
    return {
      statusCode: 500,
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      isOperational: false,
    };
  }

  return {
    statusCode: 500,
    message: 'Internal server error',
    isOperational: false,
  };
}

/** Prefer a stable public message for AI outages (rate limits, upstream 5xx). */
function toAiClientMessage(error: AiServiceError): string {
  const code = readErrorCode(error.details);

  if (code === 'AI_RATE_LIMIT' || code === 'AI_UPSTREAM_ERROR' || code === 'AI_TIMEOUT') {
    return 'AI processing temporarily unavailable';
  }

  if (error.message.toLowerCase().includes('unavailable') || error.message.toLowerCase().includes('rate limit')) {
    return 'AI processing temporarily unavailable';
  }

  return error.message || 'AI processing temporarily unavailable';
}

function readErrorCode(details: unknown): string | undefined {
  if (details && typeof details === 'object' && 'code' in details) {
    const code = (details as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }

  return undefined;
}

function isDatabaseUnavailableError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (err instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Connection / pool / unreachable
    return ['P1001', 'P1002', 'P1008', 'P1017'].includes(err.code);
  }

  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    return (
      message.includes('econnrefused') ||
      message.includes('connection terminated') ||
      message.includes('cannot reach database') ||
      message.includes('database unavailable')
    );
  }

  return false;
}

function mapPrismaErrorStatus(code: string): number {
  switch (code) {
    case 'P2002':
      return 409;
    case 'P2025':
      return 404;
    case 'P1001':
    case 'P1002':
    case 'P1008':
    case 'P1017':
      return 503;
    default:
      return 500;
  }
}
