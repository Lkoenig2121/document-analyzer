'use client';

import { useEffect, useState } from 'react';
import {
  fetchDocumentFileBlob,
  getApiErrorMessage,
  isImageMimeType,
  isPdfMimeType,
} from '@/lib/api';

export interface DocumentPreviewProps {
  documentId: string;
  mimeType: string;
  filename: string;
}

export default function DocumentPreview({
  documentId,
  mimeType,
  filename,
}: DocumentPreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImage = isImageMimeType(mimeType);
  const isPdf = isPdfMimeType(mimeType, filename);

  useEffect(() => {
    if (!isImage && !isPdf) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    setIsLoading(true);
    setError(null);
    setObjectUrl(null);

    void (async () => {
      try {
        const blob = await fetchDocumentFileBlob(documentId);
        const url = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        createdUrl = url;
        setObjectUrl(url);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Failed to load document preview.'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [documentId, isImage, isPdf]);

  if (!isImage && !isPdf) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-900">Original file</h3>
        {objectUrl ? (
          <a
            href={objectUrl}
            download={filename}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            Open full size
          </a>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center px-4 py-12 text-sm text-zinc-500">
            Loading preview…
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="flex min-h-64 items-center justify-center px-4 py-12 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && objectUrl && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob preview from authenticated download
          <img
            src={objectUrl}
            alt={`Preview of ${filename}`}
            className="mx-auto max-h-[min(70vh,720px)] w-auto max-w-full object-contain"
          />
        ) : null}

        {!isLoading && !error && objectUrl && isPdf ? (
          <iframe
            title={`Preview of ${filename}`}
            src={objectUrl}
            className="h-[min(70vh,720px)] w-full bg-white"
          />
        ) : null}
      </div>
    </section>
  );
}
