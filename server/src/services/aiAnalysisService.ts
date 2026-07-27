import { z } from 'zod';
import { AiServiceError, ValidationError } from '../lib/errors.js';
import { getGeminiModel, withGeminiErrorHandling } from '../lib/gemini.js';
import { logger } from '../lib/logger.js';
import {
  buildDocumentAnalysisPrompt,
  DOCUMENT_ANALYSIS_SYSTEM_INSTRUCTION,
} from '../prompts/documentAnalysis.prompt.js';

export interface DocumentAnalysisResult {
  summary: string;
  topics: string[];
  entities: string[];
  extractedData: Record<string, unknown>;
}

const documentAnalysisSchema = z.object({
  summary: z.string(),
  topics: z.array(z.string()),
  entities: z.array(z.string()),
  extractedData: z.record(z.string(), z.unknown()),
});

/**
 * Analyzes document text with Gemini and returns a validated structured result.
 * Controllers should call this — they must not talk to Gemini directly.
 */
export async function analyzeDocumentText(documentText: string): Promise<DocumentAnalysisResult> {
  const text = documentText.trim();

  if (!text) {
    throw new ValidationError('Document text is required for AI analysis');
  }

  const model = getGeminiModel({
    systemInstruction: DOCUMENT_ANALYSIS_SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const prompt = buildDocumentAnalysisPrompt(text);

  const response = await withGeminiErrorHandling(async () => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  }, 'Document analysis');

  return parseAnalysisResponse(response);
}

function parseAnalysisResponse(raw: string): DocumentAnalysisResult {
  const cleaned = stripCodeFences(raw).trim();

  if (!cleaned) {
    throw new AiServiceError('AI returned an empty analysis response', {
      code: 'AI_EMPTY_RESPONSE',
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    logger.warn({ rawPreview: cleaned.slice(0, 500) }, 'Failed to parse Gemini analysis JSON');
    throw new AiServiceError('AI returned invalid JSON', {
      code: 'AI_INVALID_JSON',
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  const validated = documentAnalysisSchema.safeParse(normalizeAnalysisShape(parsed));

  if (!validated.success) {
    logger.warn(
      { issues: validated.error.flatten(), rawPreview: cleaned.slice(0, 500) },
      'Gemini analysis JSON failed schema validation',
    );

    throw new AiServiceError('AI returned analysis JSON in an unexpected shape', {
      code: 'AI_INVALID_SHAPE',
      details: validated.error.flatten(),
    });
  }

  return {
    summary: validated.data.summary.trim(),
    topics: validated.data.topics.map((topic) => topic.trim()).filter(Boolean),
    entities: validated.data.entities.map((entity) => entity.trim()).filter(Boolean),
    extractedData: validated.data.extractedData,
  };
}

/**
 * Tolerates minor shape drift from the model before strict Zod validation.
 * e.g. null extractedData → {}, non-array topics → []
 */
function normalizeAnalysisShape(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;

  return {
    summary: typeof record.summary === 'string' ? record.summary : '',
    topics: Array.isArray(record.topics) ? record.topics.filter((item) => typeof item === 'string') : [],
    entities: Array.isArray(record.entities)
      ? record.entities.filter((item) => typeof item === 'string')
      : [],
    extractedData:
      record.extractedData &&
      typeof record.extractedData === 'object' &&
      !Array.isArray(record.extractedData)
        ? record.extractedData
        : {},
  };
}

/** Removes accidental markdown fences if the model ignores responseMimeType. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}
