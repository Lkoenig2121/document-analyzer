import { useQuery } from '@tanstack/react-query';
import {
  fetchDocuments,
  fetchDocumentTopics,
  type DocumentListParams,
} from '@/lib/api';
import { documentKeys } from '@/lib/queries/keys';

export function useDocuments(params: DocumentListParams = {}) {
  const filters = {
    q: params.q?.trim() || undefined,
    type: params.type,
    topics: params.topics?.length ? [...params.topics].sort() : undefined,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  };

  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: () => fetchDocuments(params),
    placeholderData: (previous) => previous,
  });
}

export function useDocumentTopics() {
  return useQuery({
    queryKey: documentKeys.topics(),
    queryFn: fetchDocumentTopics,
  });
}
