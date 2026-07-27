'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import RequireAuth from '@/app/components/auth/RequireAuth';
import DocumentChat from '@/app/components/chat/DocumentChat';
import DocumentViewer from '@/app/components/DocumentViewer';

export default function DocumentDetailPage() {
  const params = useParams();
  const rawId = params.id;
  const documentId = typeof rawId === 'string' ? rawId : '';

  return (
    <RequireAuth>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
        <Link
          href="/dashboard"
          className="w-fit text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          Back to dashboard
        </Link>

        {documentId ? (
          <>
            <DocumentViewer documentId={documentId} />
            <DocumentChat documentId={documentId} />
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
            Invalid document id.
          </p>
        )}
      </main>
    </RequireAuth>
  );
}
