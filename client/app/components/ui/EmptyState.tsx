interface EmptyStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
      {title ? <p className="text-sm font-medium text-zinc-900">{title}</p> : null}
      <p className={`text-sm text-zinc-500 ${title ? 'mt-1' : ''}`}>{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 text-sm font-medium text-zinc-900 underline-offset-2 hover:underline"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
