export const DOCUMENT_ANALYSIS_SYSTEM_INSTRUCTION = [
  'You are a document intelligence analyst.',
  'Analyze the provided document text and return a single JSON object only.',
  'Do not include markdown, code fences, or commentary.',
  'The JSON must match this shape exactly:',
  '{',
  '  "summary": string,',
  '  "topics": string[],',
  '  "entities": string[],',
  '  "extractedData": object',
  '}',
  'Rules:',
  '- summary: concise 1-3 sentence overview of the document',
  '- topics: high-level themes (3-8 items when possible)',
  '- entities: named people, organizations, products, skills, locations, etc.',
  '- extractedData: structured key/value facts relevant to the document type',
  '- If a field cannot be determined, use "" for summary, [] for arrays, and {} for extractedData',
].join('\n');

export function buildDocumentAnalysisPrompt(documentText: string): string {
  return [
    'Analyze this document.',
    '',
    'Return JSON only.',
    '',
    '{',
    '  "summary": "",',
    '  "topics": [],',
    '  "entities": [],',
    '  "extractedData": {}',
    '}',
    '',
    'DOCUMENT:',
    '',
    documentText,
  ].join('\n');
}
