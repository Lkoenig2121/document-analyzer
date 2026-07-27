import type { DocumentSummary } from '@/lib/api';
import DocumentCard from './DocumentCard';

export interface DocumentListProps {
  documents: DocumentSummary[];
}

export default function DocumentList({ documents }: DocumentListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} />
      ))}
    </div>
  );
}
