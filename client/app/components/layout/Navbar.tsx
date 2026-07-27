'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import { signOut, useSession } from '@/lib/auth-client';
import { env } from '@/lib/env';

const navItems = [{ href: '/dashboard', label: 'Dashboard' }] as const;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-8">
        <Link href="/dashboard" className="text-sm font-semibold text-zinc-900">
          {env.appName}
        </Link>

        <nav className="flex items-center gap-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {isPending ? null : session?.user ? (
            <>
              <span className="hidden text-sm text-zinc-500 sm:inline">
                {session.user.email}
              </span>
              <Button type="button" variant="outline" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
                Sign in
              </Link>
              <Button href="/signup" variant="primary">
                Sign up
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
