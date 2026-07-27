import type { ReactNode } from 'react';
import RequireAuth from '@/app/components/auth/RequireAuth';
import DashboardSidebar from '@/app/components/dashboard/DashboardSidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-0 flex-1 bg-zinc-50">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 sm:px-8">{children}</div>
        </div>
      </div>
    </RequireAuth>
  );
}
