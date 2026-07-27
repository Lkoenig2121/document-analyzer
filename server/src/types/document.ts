/** Full document payload returned by GET /documents/:id */
export interface DocumentAnalysisResponse {
  summary: string;
  topics: string[];
  entities: string[];
  extractedData: Record<string, unknown>;
  createdAt: string;
}

export interface DocumentDetailResponse {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  updatedAt: string;
  wordCount: number;
  text: string;
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
  uploadedAt: string;
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
