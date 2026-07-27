import Link from 'next/link';
import Card from '@/app/components/ui/Card';
import EmptyState from '@/app/components/ui/EmptyState';

export default function DashboardChatPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Chat</h1>
        <p className="text-sm text-zinc-500">Ask questions against a document with RAG citations.</p>
      </div>

      <Card>
        <EmptyState
          title="Open a document to chat"
          message="Chat lives on each document’s detail page. Pick a file from your dashboard to get started."
        />
        <div className="mt-4 text-center">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-900 underline-offset-2 hover:underline"
          >
            Go to documents
          </Link>
        </div>
      </Card>
    </div>
  );
}
