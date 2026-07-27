import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const normalized = normalizeError(err);

  if (!normalized.isOperational) {
    logger.error({ err }, 'Unhandled error');
  } else {
    logger.warn({ err, statusCode: normalized.statusCode }, normalized.message);
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      message: normalized.message,
      ...(normalized.code && { code: normalized.code }),
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

function mapPrismaErrorStatus(code: string): number {
  switch (code) {
    case 'P2002':
      return 409;
    case 'P2025':
      return 404;
    default:
      return 500;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'Route not found'));
}
