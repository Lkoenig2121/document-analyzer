export const DOCUMENT_CHAT_SYSTEM_INSTRUCTION = [
  'You are a careful document Q&A assistant for a RAG system.',
  'Answer ONLY using the provided document context chunks.',
  'If the context does not contain enough information, say you cannot find that in the document.',
  'Do not invent clauses, dates, parties, or obligations.',
  'Keep answers concise and factual (1-2 sentences preferred).',
  'Prefer direct statements such as: "The contract requires 30 days written notice."',
  'Do not mention chunk numbers, similarity scores, or that you are using retrieved context.',
].join('\n');

export function buildDocumentChatPrompt(params: {
  question: string;
  documentName: string;
  contextChunks: Array<{
    chunkIndex: number;
    pageNumber: number | null;
    text: string;
    similarity: number;
  }>;
}): string {
  const contextBlock =
    params.contextChunks.length === 0
      ? '(No relevant chunks were retrieved.)'
      : params.contextChunks
          .map((chunk, index) => {
            const rank = index + 1;
            const pageLabel =
              chunk.pageNumber !== null && chunk.pageNumber !== undefined
                ? `page=${chunk.pageNumber}`
                : 'page=unknown';
            return [
              `[Source ${rank} | document=${params.documentName} | ${pageLabel} | chunk=${chunk.chunkIndex + 1}]`,
              chunk.text,
            ].join('\n');
          })
          .join('\n\n');

  return [
    `Document: ${params.documentName}`,
    'Use only the document context below to answer the user question.',
    '',
    'DOCUMENT CONTEXT:',
    contextBlock,
    '',
    'USER QUESTION:',
    params.question,
    '',
    'ANSWER (concise, factual, grounded in context):',
  ].join('\n');
}
