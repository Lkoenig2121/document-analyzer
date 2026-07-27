'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function buildPageWindow(page: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = buildPageWindow(page, totalPages);

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2"
      aria-label="Document pagination"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      {pages.map((pageNumber) => {
        const isActive = pageNumber === page;

        return (
          <button
            key={pageNumber}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onPageChange(pageNumber)}
            className={`min-w-9 rounded px-3 py-1.5 text-sm transition-colors ${
              isActive
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {pageNumber}
          </button>
        );
      })}

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
