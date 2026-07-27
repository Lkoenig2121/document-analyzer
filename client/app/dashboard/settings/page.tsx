'use client';

import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import { signOut, useSession } from '@/lib/auth-client';

export default function DashboardSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500">Account details for your Document AI workspace.</p>
      </div>

      <Card className="flex max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Email</p>
          <p className="text-sm text-zinc-900">{session?.user?.email ?? '—'}</p>
        </div>
        {session?.user?.name ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Name</p>
            <p className="text-sm text-zinc-900">{session.user.name}</p>
          </div>
        ) : null}
        <div className="border-t border-zinc-100 pt-4">
          <Button type="button" variant="outline" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}
