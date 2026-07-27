'use client';

export type DocumentTypeFilterValue = 'all' | 'pdf' | 'docx' | 'image';

export interface DocumentFiltersProps {
  topics: string[];
  selectedType: DocumentTypeFilterValue;
  selectedTopics: string[];
  onTypeChange: (type: DocumentTypeFilterValue) => void;
  onTopicsChange: (topics: string[]) => void;
}

const TYPE_OPTIONS: Array<{ value: DocumentTypeFilterValue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'image', label: 'Images' },
];

export default function DocumentFilters({
  topics,
  selectedType,
  selectedTopics,
  onTypeChange,
  onTopicsChange,
}: DocumentFiltersProps) {
  function toggleTopic(topic: string) {
    if (selectedTopics.includes(topic)) {
      onTopicsChange(selectedTopics.filter((item) => item !== topic));
      return;
    }

    onTopicsChange([...selectedTopics, topic]);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="document-type-filter" className="text-sm font-medium text-zinc-900">
          Document Type
        </label>
        <select
          id="document-type-filter"
          value={selectedType}
          onChange={(event) => onTypeChange(event.target.value as DocumentTypeFilterValue)}
          className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {topics.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-900">Topics</p>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => {
              const checked = selectedTopics.includes(topic);

              return (
                <button
                  key={topic}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => toggleTopic(topic)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors ${
                    checked
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
          {selectedTopics.length > 0 ? (
            <button
              type="button"
              onClick={() => onTopicsChange([])}
              className="w-fit text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
            >
              Clear topic filters
            </button>
          ) : (
            <p className="text-xs text-zinc-500">
              Select topics to narrow results (documents must match all selected topics).
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
