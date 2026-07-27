'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client';

/**
 * Sends already-authenticated users to the dashboard.
 * Use on public entry points: landing, login, signup.
 */
export default function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace('/dashboard');
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center p-8">
        <p className="text-sm text-zinc-500">Checking session...</p>
      </main>
    );
  }

  if (session?.user) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center p-8">
        <p className="text-sm text-zinc-500">Taking you to your dashboard...</p>
      </main>
    );
  }

  return <>{children}</>;
}
