'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import RedirectIfAuthenticated from '@/app/components/auth/RedirectIfAuthenticated';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import { signUp } from '@/lib/auth-client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message ?? 'Unable to create account.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Unable to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RedirectIfAuthenticated>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-zinc-900">Create account</h1>
          <p className="text-sm text-zinc-500">Your uploads stay private to your account.</p>
        </div>

        <Card className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-900">Name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 outline-none ring-zinc-400 focus:ring-2"
              />
            </label>

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

            <Button type="submit" isLoading={isSubmitting} loadingText="Creating...">
              Create account
            </Button>
          </form>

          <p className="text-sm text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-zinc-900 hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </main>
    </RedirectIfAuthenticated>
  );
}
