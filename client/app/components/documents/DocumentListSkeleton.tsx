export default function DocumentListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading documents...">
      <p className="text-sm text-zinc-600">Loading documents...</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="flex h-56 flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200" />
            <div className="mt-2 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-zinc-200" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-200" />
            </div>
            <div className="mt-auto flex gap-2">
              <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-200" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
