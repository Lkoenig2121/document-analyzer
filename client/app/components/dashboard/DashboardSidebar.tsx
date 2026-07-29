'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId } from 'react';
import Button from '@/app/components/ui/Button';
import { signOut, useSession } from '@/lib/auth-client';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', match: (path: string) => path === '/dashboard' },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    match: (path: string) => path.startsWith('/dashboard/settings'),
  },
] as const;

export interface DashboardSidebarProps {
  /** Mobile drawer open state. Ignored on desktop (always visible). */
  open?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ open = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const titleId = useId();

  useEffect(() => {
    onClose?.();
    // Close the mobile drawer when the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to navigation
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  async function handleSignOut() {
    await signOut();
    onClose?.();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close navigation"
        className={`fixed inset-0 z-40 bg-zinc-900/40 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />

      <aside
        id="dashboard-sidebar"
        aria-labelledby={titleId}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-zinc-200 bg-white shadow-lg transition-transform duration-200 ease-out md:static md:z-auto md:w-56 md:max-w-none md:translate-x-0 md:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <Link
            id={titleId}
            href="/dashboard"
            className="text-sm font-semibold tracking-tight text-zinc-900"
            onClick={onClose}
          >
            Document AI
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map((item) => {
            const isActive = item.match(pathname);

            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                onClick={onClose}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-zinc-200 p-4">
          {session?.user?.email ? (
            <p className="truncate text-xs text-zinc-500" title={session.user.email}>
              {session.user.email}
            </p>
          ) : null}
          <Button type="button" variant="outline" className="w-full" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </div>
      </aside>
    </>
  );
}
