'use client';

import { useState } from 'react';
import AnalysisSection from '@/app/components/analysis/AnalysisSection';
import BadgeList from '@/app/components/analysis/BadgeList';
import ExtractedDataPanel from '@/app/components/analysis/ExtractedDataPanel';
import Card from '@/app/components/ui/Card';
import EmptyState from '@/app/components/ui/EmptyState';
import ErrorMessage from '@/app/components/ui/ErrorMessage';
import LoadingState from '@/app/components/ui/LoadingState';
import { analyzeDocument, getApiErrorMessage } from '@/lib/api';
import { formatUploadedDate, getFileTypeLabel } from '@/lib/document-format';
import { useDocument } from '@/lib/hooks/useDocument';

export interface DocumentViewerProps {
  documentId: string;
}

export default function DocumentViewer({ documentId }: DocumentViewerProps) {
  const { data, isLoading, isError, error, refetch } = useDocument(documentId);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingState message="Loading document..." />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message={getApiErrorMessage(error, 'Failed to load document.')}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!data) {
    return <EmptyState message="Document not found." />;
  }

  const { document, content, analysis } = data;
  const fileType = getFileTypeLabel(document.filename);
  const uploadedDate = formatUploadedDate(document.uploadedAt);
  const text = content.text.trim();
  const summary = analysis?.summary?.trim() ?? '';
  const topics = analysis?.topics ?? [];
  const entities = analysis?.entities ?? [];
  const extractedData = analysis?.extractedData ?? {};
  const hasExtractedData = Object.keys(extractedData).length > 0;
  const hasAnalysis = Boolean(summary || topics.length || entities.length || hasExtractedData);

  async function handleAnalyze() {
    setAnalyzeError(null);
    setIsAnalyzing(true);

    try {
      await analyzeDocument(documentId);
      await refetch();
    } catch (err) {
      setAnalyzeError(getApiErrorMessage(err, 'Failed to run AI analysis.'));
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-zinc-500">Document Detail Page</p>
          <h1 className="text-2xl font-semibold text-zinc-900" title={document.filename}>
            {document.filename}
          </h1>
          <p className="text-sm text-zinc-500">
            {fileType} Document · Uploaded {uploadedDate}
            {content.wordCount > 0 ? ` · ${content.wordCount} words` : ''}
          </p>
        </div>

        {text && !hasAnalysis ? (
          <button
            type="button"
            onClick={() => {
              void handleAnalyze();
            }}
            disabled={isAnalyzing}
            className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzing ? 'Analyzing…' : 'Run AI analysis'}
          </button>
        ) : null}
      </div>

      {analyzeError ? <ErrorMessage message={analyzeError} /> : null}

      <Card className="flex flex-col gap-6">
        <AnalysisSection title="AI Summary">
          {summary ? (
            <p className="text-sm leading-relaxed text-zinc-700">{summary}</p>
          ) : (
            <p className="text-sm text-zinc-500">No AI summary available for this document yet.</p>
          )}
        </AnalysisSection>

        <div className="border-t border-zinc-200" />

        <AnalysisSection title="Topics">
          <BadgeList items={topics} emptyMessage="No topics identified." />
        </AnalysisSection>

        <div className="border-t border-zinc-200" />

        <AnalysisSection title="Entities">
          <BadgeList items={entities} emptyMessage="No entities identified." />
        </AnalysisSection>

        <div className="border-t border-zinc-200" />

        <AnalysisSection title="Extracted Information">
          {hasExtractedData ? (
            <ExtractedDataPanel data={extractedData} />
          ) : (
            <p className="text-sm text-zinc-500">No structured data extracted.</p>
          )}
        </AnalysisSection>

        <div className="border-t border-zinc-200" />

        <AnalysisSection title="Original Text">
          {text ? (
            <pre className="max-h-128 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800">
              {content.text}
            </pre>
          ) : (
            <EmptyState message="No extracted text available for this document." />
          )}
        </AnalysisSection>
      </Card>
    </div>
  );
}
