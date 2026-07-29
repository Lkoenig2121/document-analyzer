'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import DashboardSidebar from '@/app/components/dashboard/DashboardSidebar';

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 bg-zinc-50">
      <DashboardSidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={navOpen}
            aria-controls="dashboard-sidebar"
            onClick={() => setNavOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <span aria-hidden="true" className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 rounded bg-current" />
              <span className="block h-0.5 w-4 rounded bg-current" />
              <span className="block h-0.5 w-4 rounded bg-current" />
            </span>
          </button>
          <p className="text-sm font-semibold text-zinc-900">Document AI</p>
        </div>

        <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
