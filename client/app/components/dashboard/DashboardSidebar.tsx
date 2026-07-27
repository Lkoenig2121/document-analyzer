'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-5 py-5">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-zinc-900">
          Document AI
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {navItems.map((item) => {
          const isActive = item.match(pathname);

          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
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
  );
}
