/**
 * Central API entry point.
 * Import from here in app code — not from individual api/* modules.
 */
export { api, getApiBaseUrl } from './api/client';
export {
  fetchDocument,
  fetchDocuments,
  fetchDocumentTopics,
  analyzeDocument,
  chatWithDocument,
  canPreviewDocument,
  fetchDocumentFileBlob,
  getDocumentFileUrl,
  getUploadErrorMessage,
  isImageMimeType,
  isPdfMimeType,
  searchDocuments,
  uploadDocument,
  type DocumentAnalysis,
  type DocumentChatResult,
  type DocumentChatSource,
  type DocumentDetail,
  type DocumentListPage,
  type DocumentListParams,
  type DocumentRecord,
  type DocumentSummary,
  type UploadDocumentOptions,
} from './api/documents';
export { getApiErrorMessage, type ApiErrorResponse } from './api/errors';
