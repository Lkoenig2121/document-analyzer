import type { AxiosProgressEvent } from 'axios';
import { api, getApiBaseUrl } from './client';
import { getApiErrorMessage } from './errors';
import {
  USE_DASHBOARD_MOCK_DATA,
  getMockDocumentDetail,
  getMockDocumentPage,
  isMockDocumentId,
  MOCK_TOPICS,
} from '@/lib/mock/documents';

export interface DocumentRecord {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  id: string;
  originalName: string;
  mimeType: string;
  uploadedAt: string;
  analysis: {
    topics: string[];
    summary: string;
  } | null;
}

export interface DocumentDetail {
  document: {
    id: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: string;
    updatedAt: string;
  };
  content: {
    text: string;
    wordCount: number;
  };
  analysis: DocumentAnalysis | null;
}

export interface DocumentAnalysis {
  summary: string;
  topics: string[];
  entities: string[];
  extractedData: Record<string, unknown>;
  createdAt: string;
}

interface DocumentDetailResponse {
  success: true;
  data: DocumentDetail;
}

interface DocumentUploadResponse {
  success: true;
  data: DocumentRecord;
}

export interface UploadDocumentOptions {
  file: File;
  endpoint?: string;
  fieldName?: string;
  onUploadProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface DocumentListParams {
  q?: string;
  type?: 'pdf' | 'docx' | 'image' | 'txt';
  topics?: string[];
  page?: number;
  limit?: number;
}

export interface DocumentListPage {
  documents: DocumentSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function fetchDocuments(
  params: DocumentListParams = {},
): Promise<DocumentListPage> {
  if (USE_DASHBOARD_MOCK_DATA) {
    return getMockDocumentPage(params);
  }

  const response = await api.get<DocumentListPage>('/documents', {
    params: {
      ...(params.q ? { q: params.q } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.topics && params.topics.length > 0 ? { topic: params.topics } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
  return response.data;
}

export async function searchDocuments(query: string): Promise<DocumentListPage> {
  return fetchDocuments({ q: query });
}

export async function fetchDocumentTopics(): Promise<string[]> {
  if (USE_DASHBOARD_MOCK_DATA) {
    return MOCK_TOPICS;
  }

  const response = await api.get<string[]>('/documents/topics');
  return response.data;
}

export async function fetchDocument(id: string): Promise<DocumentDetail> {
  if (USE_DASHBOARD_MOCK_DATA || isMockDocumentId(id)) {
    const mock = getMockDocumentDetail(id);
    if (mock) {
      return mock;
    }
    if (isMockDocumentId(id)) {
      throw new Error('Mock document not found.');
    }
  }

  const response = await api.get<DocumentDetailResponse>(`/documents/${id}`);
  return response.data.data;
}

export interface DocumentChatSource {
  document: string;
  chunk: number;
  page?: number;
  text?: string;
  similarity?: number;
}

export interface DocumentChatResult {
  answer: string;
  sources: DocumentChatSource[];
}

interface DocumentChatResponse {
  success: true;
  data: DocumentChatResult;
}

export async function analyzeDocument(
  documentId: string,
): Promise<DocumentDetail> {
  if (USE_DASHBOARD_MOCK_DATA || isMockDocumentId(documentId)) {
    const mock = getMockDocumentDetail(documentId);
    if (mock) {
      return mock;
    }
    if (isMockDocumentId(documentId)) {
      throw new Error('Mock document not found.');
    }
  }

  const response = await api.post<DocumentDetailResponse>(
    `/documents/${documentId}/analyze`,
    {},
    { timeout: 90_000 },
  );

  return response.data.data;
}

export async function chatWithDocument(
  documentId: string,
  question: string,
): Promise<DocumentChatResult> {
  const trimmed = question.trim();

  if (!trimmed) {
    throw new Error('Question is required.');
  }

  if (USE_DASHBOARD_MOCK_DATA || isMockDocumentId(documentId)) {
    const mock = getMockDocumentDetail(documentId);
    if (mock) {
      return mockChatAnswer(mock, trimmed);
    }
    if (isMockDocumentId(documentId)) {
      throw new Error('Mock document not found.');
    }
  }

  const response = await api.post<DocumentChatResponse>(
    `/documents/${documentId}/chat`,
    { question: trimmed },
    { timeout: 90_000 },
  );

  return response.data.data;
}

function mockChatAnswer(
  detail: DocumentDetail,
  question: string,
): DocumentChatResult {
  const haystack = [
    detail.analysis?.summary ?? '',
    detail.content.text,
    JSON.stringify(detail.analysis?.extractedData ?? {}),
  ]
    .join('\n')
    .toLowerCase();

  const q = question.toLowerCase();
  const sourceBase: DocumentChatSource = {
    document: detail.document.filename,
    chunk: 1,
    page: 1,
    text: detail.content.text.slice(0, 280),
    similarity: 0.82,
  };

  const looksLikeTermination =
    q.includes('terminat') || q.includes('cancel') || q.includes('end') || q.includes('notice');

  if (looksLikeTermination && (haystack.includes('terminat') || haystack.includes('60-day') || haystack.includes('24-month') || haystack.includes('notice'))) {
    return {
      answer: haystack.includes('60-day')
        ? 'The agreement can be terminated with 60 days written notice.'
        : 'The contract requires 30 days written notice.',
      sources: [{ ...sourceBase, page: 4, chunk: 12, similarity: 0.88 }],
    };
  }

  if ((q.includes('sign') || q.includes('who')) && (haystack.includes('acme') || haystack.includes('northwind') || haystack.includes('parties'))) {
    return {
      answer: 'John Smith and ABC Corporation.',
      sources: [{ ...sourceBase, page: 1, chunk: 1 }],
    };
  }

  if (q.includes('payment') || q.includes('pay')) {
    return {
      answer: 'Payment is due within 30 days.',
      sources: [{ ...sourceBase, page: 2, chunk: 3 }],
    };
  }

  if (detail.analysis?.summary) {
    return {
      answer: detail.analysis.summary,
      sources: [sourceBase],
    };
  }

  return {
    answer: 'I could not find relevant information in this document to answer that question.',
    sources: [],
  };
}

export async function uploadDocument({
  file,
  endpoint = '/documents',
  fieldName = 'file',
  onUploadProgress,
  signal,
}: UploadDocumentOptions): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await api.post<DocumentUploadResponse>(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    signal,
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (!onUploadProgress) {
        return;
      }

      const total = event.total ?? file.size;
      const progress = total > 0 ? Math.round((event.loaded * 100) / total) : 0;
      onUploadProgress(Math.min(progress, 100));
    },
  });

  return response.data.data;
}

export function getDocumentFileUrl(id: string): string {
  return `${getApiBaseUrl()}/documents/${id}/file`;
}

/** Authenticated blob download for inline image/PDF previews. */
export async function fetchDocumentFileBlob(id: string): Promise<Blob> {
  const response = await api.get<Blob>(`/documents/${id}/file`, {
    responseType: 'blob',
  });

  return response.data;
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isPdfMimeType(mimeType: string, filename?: string): boolean {
  if (mimeType === 'application/pdf') {
    return true;
  }

  return Boolean(filename?.toLowerCase().endsWith('.pdf'));
}

export function canPreviewDocument(mimeType: string, filename?: string): boolean {
  return isImageMimeType(mimeType) || isPdfMimeType(mimeType, filename);
}

export function getUploadErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, 'Upload failed. Please try again.');
}
