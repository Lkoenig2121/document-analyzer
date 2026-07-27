import BadgeList from '@/app/components/analysis/BadgeList';
import {
  formatAnalysisLabel,
  formatAnalysisValue,
  isStringArray,
} from '@/lib/analysis-format';

interface ExtractedDataPanelProps {
  data: Record<string, unknown>;
}

export default function ExtractedDataPanel({ data }: ExtractedDataPanelProps) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500">No structured data extracted.</p>;
  }

  return (
    <dl className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-2">
          <dt className="text-sm font-medium text-zinc-900">{formatAnalysisLabel(key)}</dt>
          <dd className="text-sm text-zinc-700">
            {isStringArray(value) ? (
              <BadgeList items={value} emptyMessage="No values." />
            ) : (
              <span className="whitespace-pre-wrap">{formatAnalysisValue(value) || '—'}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
