'use client';

import { type FormEvent, useState } from 'react';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import {
  chatWithDocument,
  getApiErrorMessage,
  type DocumentChatResult,
  type DocumentChatSource,
} from '@/lib/api';

export interface DocumentChatProps {
  documentId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: DocumentChatResult['sources'];
}

export default function DocumentChat({ documentId }: DocumentChatProps) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = question.trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await chatWithDocument(documentId, trimmed);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
        },
      ]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to get an answer. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-zinc-900">Chat With Document</h2>
        <p className="text-sm text-zinc-500">
          Ask a question. Answers include source citations from retrieved chunks.
        </p>
      </div>

      <div className="flex max-h-96 min-h-40 flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Example: &quot;What is the termination policy?&quot;
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col gap-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {message.role === 'user' ? 'User' : 'AI'}
              </p>
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-zinc-900 text-white'
                    : 'border border-zinc-200 bg-white text-zinc-800'
                }`}
              >
                <p>{message.content}</p>
                {message.role === 'assistant' && message.sources && message.sources.length > 0 ? (
                  <SourceCitations sources={message.sources} />
                ) : null}
              </div>
            </div>
          ))
        )}
        {isSubmitting ? (
          <p className="text-sm text-zinc-500">Searching document and generating answer...</p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="document-chat-question">
          Question
        </label>
        <input
          id="document-chat-question"
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about this document..."
          disabled={isSubmitting}
          className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 disabled:opacity-60"
        />
        <Button type="submit" isLoading={isSubmitting} loadingText="Asking..." disabled={!question.trim()}>
          Ask
        </Button>
      </form>
    </Card>
  );
}

function SourceCitations({ sources }: { sources: DocumentChatSource[] }) {
  return (
    <div className="mt-3 border-t border-zinc-200 pt-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sources</p>
      <ul className="mt-1 flex flex-col gap-1">
        {sources.map((source) => (
          <li key={`${source.document}-${source.chunk}-${source.page ?? 'na'}`} className="text-xs text-zinc-600">
            <span className="font-medium text-zinc-800">{source.document}</span>
            {source.page ? <span> · Page {source.page}</span> : null}
            <span> · Chunk {source.chunk}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
