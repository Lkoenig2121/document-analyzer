'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

interface AppShellProps {
  children: ReactNode;
}

function isAppRoute(pathname: string): boolean {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/documents');
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const hideMarketingNav = isAppRoute(pathname);

  return (
    <div className="flex min-h-full flex-col bg-zinc-50">
      {hideMarketingNav ? null : <Navbar />}
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
