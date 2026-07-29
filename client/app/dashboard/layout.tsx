import type { ReactNode } from 'react';
import RequireAuth from '@/app/components/auth/RequireAuth';
import DashboardShell from '@/app/components/dashboard/DashboardShell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  );
}
