import BadgeList from '@/app/components/analysis/BadgeList';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import type { DocumentSummary } from '@/lib/api';
import { formatUploadedDate, getFileTypeLabel } from '@/lib/document-format';

export interface DocumentCardProps {
  document: DocumentSummary;
}

export default function DocumentCard({ document }: DocumentCardProps) {
  const fileType = getFileTypeLabel(document.originalName);
  const uploadedDate = formatUploadedDate(document.uploadedAt);
  const summary = document.analysis?.summary?.trim() ?? '';
  const topics = document.analysis?.topics ?? [];
  const detailUrl = `/documents/${document.id}`;

  return (
    <Card className="flex h-full flex-col justify-between gap-5 transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="truncate text-[15px] font-semibold text-zinc-900" title={document.originalName}>
            {document.originalName}
          </h2>
          <p className="text-sm text-zinc-500">
            {fileType} · Uploaded {uploadedDate}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400">AI Summary</h3>
          {summary ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-zinc-700">{summary}</p>
          ) : (
            <p className="text-sm text-zinc-500">No AI summary available yet.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400">Topics</h3>
          <BadgeList items={topics} emptyMessage="No topics yet." />
        </div>
      </div>

      <Button href={detailUrl} variant="outline" className="w-fit">
        View Document
      </Button>
    </Card>
  );
}
