import { useQuery } from '@tanstack/react-query';
import { fetchDocument } from '@/lib/api';
import { documentKeys } from '@/lib/queries/keys';

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => fetchDocument(id),
    enabled: Boolean(id),
  });
}
