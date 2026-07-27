'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import RedirectIfAuthenticated from '@/app/components/auth/RedirectIfAuthenticated';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import { signIn } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message ?? 'Unable to sign in.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RedirectIfAuthenticated>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
          <p className="text-sm text-zinc-500">Access only your documents.</p>
        </div>

        <Card className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-900">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 outline-none ring-zinc-400 focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-900">Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 outline-none ring-zinc-400 focus:ring-2"
              />
            </label>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}

            <Button type="submit" isLoading={isSubmitting} loadingText="Signing in...">
              Sign in
            </Button>
          </form>

          <p className="text-sm text-zinc-500">
            No account?{' '}
            <Link href="/signup" className="font-medium text-zinc-900 hover:underline">
              Create one
            </Link>
          </p>
        </Card>
      </main>
    </RedirectIfAuthenticated>
  );
}
