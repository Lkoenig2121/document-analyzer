'use client';

import AnalysisSection from '@/app/components/analysis/AnalysisSection';
import BadgeList from '@/app/components/analysis/BadgeList';
import ExtractedDataPanel from '@/app/components/analysis/ExtractedDataPanel';
import Card from '@/app/components/ui/Card';
import EmptyState from '@/app/components/ui/EmptyState';
import ErrorMessage from '@/app/components/ui/ErrorMessage';
import LoadingState from '@/app/components/ui/LoadingState';
import { getApiErrorMessage } from '@/lib/api';

export interface DocumentAnalysisData {
  summary: string;
  topics: string[];
  entities: string[];
  extractedData: Record<string, unknown>;
}

export interface DocumentAnalysisProps {
  analysis?: DocumentAnalysisData | null;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

export default function DocumentAnalysis({
  analysis,
  isLoading = false,
  isError = false,
  error,
  onRetry,
}: DocumentAnalysisProps) {
  if (isLoading) {
    return (
      <Card>
        <LoadingState message="Loading AI analysis..." />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <ErrorMessage
          message={getApiErrorMessage(error, 'Failed to load AI analysis.')}
          onRetry={onRetry}
        />
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <EmptyState message="No AI analysis available for this document yet." />
      </Card>
    );
  }

  const hasSummary = analysis.summary.trim().length > 0;
  const hasTopics = analysis.topics.length > 0;
  const hasEntities = analysis.entities.length > 0;
  const hasExtractedData = Object.keys(analysis.extractedData).length > 0;
  const hasAnyAnalysis = hasSummary || hasTopics || hasEntities || hasExtractedData;

  if (!hasAnyAnalysis) {
    return (
      <Card>
        <EmptyState message="AI analysis completed but no results were returned." />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6">
      <h2 className="text-base font-semibold text-zinc-900">AI Analysis</h2>

      {hasSummary ? (
        <AnalysisSection title="Summary">
          <p className="text-sm leading-relaxed text-zinc-700">{analysis.summary}</p>
        </AnalysisSection>
      ) : null}

      {hasTopics ? (
        <AnalysisSection title="Topics">
          <BadgeList items={analysis.topics} emptyMessage="No topics identified." />
        </AnalysisSection>
      ) : null}

      {hasEntities ? (
        <AnalysisSection title="Entities">
          <BadgeList items={analysis.entities} emptyMessage="No entities identified." />
        </AnalysisSection>
      ) : null}

      {hasExtractedData ? (
        <AnalysisSection title="Extracted Data">
          <ExtractedDataPanel data={analysis.extractedData} />
        </AnalysisSection>
      ) : null}
    </Card>
  );
}
