import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIRequestInputError,
  GoogleGenerativeAIResponseError,
  type GenerativeModel,
  type ModelParams,
} from '@google/generative-ai';
import { env } from '../config/env.js';
import { DEFAULT_GEMINI_MODEL, GEMINI_REQUEST_TIMEOUT_MS } from '../config/gemini.js';
import { AiServiceError } from './errors.js';
import { logger } from './logger.js';

const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenerativeAI | undefined;
};

function createGeminiClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

/** Singleton Gemini SDK client. Mirrors the Prisma client pattern in `lib/prisma.ts`. */
export const geminiClient = globalForGemini.gemini ?? createGeminiClient();

if (env.NODE_ENV !== 'production') {
  globalForGemini.gemini = geminiClient;
}

export interface GetGeminiModelOptions {
  model?: string;
  generationConfig?: ModelParams['generationConfig'];
  systemInstruction?: ModelParams['systemInstruction'];
}

/**
 * Returns a configured GenerativeModel instance.
 * Services should call this instead of constructing clients directly.
 */
export function getGeminiModel(options: GetGeminiModelOptions = {}): GenerativeModel {
  const modelParams: ModelParams = {
    model: options.model ?? env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
  };

  if (options.generationConfig) {
    modelParams.generationConfig = options.generationConfig;
  }

  if (options.systemInstruction) {
    modelParams.systemInstruction = options.systemInstruction;
  }

  return geminiClient.getGenerativeModel(modelParams, {
    timeout: GEMINI_REQUEST_TIMEOUT_MS,
  });
}

/**
 * Maps Gemini SDK errors to operational AppErrors for controllers/middleware.
 * Never expose raw API keys or full upstream responses to clients.
 */
export function mapGeminiError(error: unknown, context?: string): AiServiceError {
  const prefix = context ? `${context}: ` : '';

  if (error instanceof GoogleGenerativeAIRequestInputError) {
    return new AiServiceError(`${prefix}Invalid AI request`, {
      code: 'AI_INVALID_REQUEST',
      cause: error.message,
    });
  }

  if (error instanceof GoogleGenerativeAIAbortError) {
    return new AiServiceError(`${prefix}AI request timed out`, {
      code: 'AI_TIMEOUT',
      cause: error.message,
    });
  }

  if (error instanceof GoogleGenerativeAIFetchError) {
    logger.error(
      {
        err: error,
        status: error.status,
        statusText: error.statusText,
        errorDetails: error.errorDetails,
      },
      'Gemini API request failed',
    );

    if (error.status === 429) {
      return new AiServiceError(`${prefix}AI rate limit exceeded. Try again later.`, {
        code: 'AI_RATE_LIMIT',
        status: error.status,
      });
    }

    if (error.status === 401 || error.status === 403) {
      return new AiServiceError(`${prefix}AI service authentication failed`, {
        code: 'AI_AUTH_ERROR',
        status: error.status,
      });
    }

    return new AiServiceError(`${prefix}AI service unavailable`, {
      code: 'AI_UPSTREAM_ERROR',
      status: error.status,
      statusText: error.statusText,
    });
  }

  if (error instanceof GoogleGenerativeAIResponseError) {
    return new AiServiceError(`${prefix}AI returned an invalid or blocked response`, {
      code: 'AI_RESPONSE_ERROR',
      cause: error.message,
    });
  }

  if (error instanceof AiServiceError) {
    return error;
  }

  logger.error({ err: error }, 'Unexpected Gemini error');

  return new AiServiceError(`${prefix}AI service request failed`, {
    code: 'AI_UNKNOWN_ERROR',
    cause: error instanceof Error ? error.message : String(error),
  });
}

/** Convenience wrapper for service-layer Gemini calls with consistent error mapping. */
export async function withGeminiErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapGeminiError(error, context);
  }
}
