'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace('/login');
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center p-8">
        <p className="text-sm text-zinc-500">Checking session...</p>
      </main>
    );
  }

  if (!session?.user) {
    return null;
  }

  return <>{children}</>;
}
