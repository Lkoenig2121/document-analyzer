'use client';

import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import RedirectIfAuthenticated from '@/app/components/auth/RedirectIfAuthenticated';
import { env } from '@/lib/env';

export default function Home() {
  return (
    <RedirectIfAuthenticated>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 p-8">
        <div className="flex max-w-xl flex-col gap-4">
          <p className="text-sm font-medium text-zinc-500">{env.appName}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Document Intelligence Platform
          </h1>
          <p className="text-base leading-relaxed text-zinc-600">
            Upload PDFs, DOCX files, and more. Extract text, run AI analysis, and explore topics,
            entities, and structured insights — privately, under your account.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button href="/signup">Create account</Button>
            <Link
              href="/login"
              className="inline-flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </RedirectIfAuthenticated>
  );
}
