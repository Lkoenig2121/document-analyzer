export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown> = {}) => [...documentKeys.lists(), filters] as const,
  topics: () => [...documentKeys.all, 'topics'] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};
