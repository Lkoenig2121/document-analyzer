/** AI analysis returned by GET /documents/:id */
export interface DocumentAnalysisResponse {
  summary: string;
  topics: string[];
  entities: string[];
  extractedData: Record<string, unknown>;
  createdAt: string;
}

/** Nested detail payload returned by GET /documents/:id */
export interface DocumentDetailResponse {
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
  analysis: DocumentAnalysisResponse | null;
}

export interface DocumentDetailApiResponse {
  success: true;
  data: DocumentDetailResponse;
}

/** Summary row returned by GET /documents */
export interface DocumentSummaryResponse {
  id: string;
  originalName: string;
  mimeType: string;
  uploadedAt: string;
  analysis: {
    topics: string[];
    summary: string;
  } | null;
}

/** Paginated list returned by GET /documents */
export interface DocumentListPageResponse {
  documents: DocumentSummaryResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Metadata returned after upload (POST /documents) */
export interface DocumentRecordResponse {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  updatedAt: string;
}
