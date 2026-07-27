'use client';

import { useEffect, useState } from 'react';
import DocumentFilters, {
  type DocumentTypeFilterValue,
} from '@/app/components/documents/DocumentFilters';
import DocumentList from '@/app/components/documents/DocumentList';
import DocumentListSkeleton from '@/app/components/documents/DocumentListSkeleton';
import DocumentSearch from '@/app/components/documents/DocumentSearch';
import Pagination from '@/app/components/documents/Pagination';
import EmptyState from '@/app/components/ui/EmptyState';
import ErrorMessage from '@/app/components/ui/ErrorMessage';
import { getApiErrorMessage } from '@/lib/api';
import { useDocumentTopics, useDocuments } from '@/lib/hooks/useDocuments';

const PAGE_SIZE = 20;

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default function DashboardDocumentsSection({
  onRequestUpload,
}: {
  onRequestUpload?: () => void;
} = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentTypeFilterValue>('all');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(searchQuery, 250);

  const { data: availableTopics = [] } = useDocumentTopics();

  const { data, isLoading, isError, error, refetch, isFetching } = useDocuments({
    q: debouncedQuery || undefined,
    type: selectedType === 'all' ? undefined : selectedType,
    topics: selectedTopics,
    page,
    limit: PAGE_SIZE,
  });

  const documents = data?.documents ?? [];
  const totalPages = data?.totalPages ?? 0;
  const currentPage = data?.page ?? page;
  const showInitialLoading = isLoading && !data;
  const hasActiveFilters =
    Boolean(debouncedQuery) || selectedType !== 'all' || selectedTopics.length > 0;

  function updateSearch(value: string) {
    setSearchQuery(value);
    setPage(1);
  }

  function updateType(value: DocumentTypeFilterValue) {
    setSelectedType(value);
    setPage(1);
  }

  function updateTopics(value: string[]) {
    setSelectedTopics(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <DocumentSearch value={searchQuery} onChange={updateSearch} />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-900">Filters</p>
        <DocumentFilters
          topics={availableTopics}
          selectedType={selectedType}
          selectedTopics={selectedTopics}
          onTypeChange={updateType}
          onTopicsChange={updateTopics}
        />
      </div>

      {showInitialLoading ? <DocumentListSkeleton /> : null}

      {isError ? (
        <ErrorMessage
          title="Unable to load documents."
          message={getApiErrorMessage(error, 'Something went wrong while fetching documents.')}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}

      {!showInitialLoading && !isError && documents.length === 0 ? (
        <EmptyState
          title="No documents found."
          message={
            hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Upload your first document.'
          }
          actionLabel={!hasActiveFilters && onRequestUpload ? 'Upload Document' : undefined}
          onAction={!hasActiveFilters ? onRequestUpload : undefined}
        />
      ) : null}

      {!isError && documents.length > 0 ? (
        <div className={`flex flex-col gap-6 ${isFetching ? 'opacity-70' : ''}`}>
          <DocumentList documents={documents} />
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
}
