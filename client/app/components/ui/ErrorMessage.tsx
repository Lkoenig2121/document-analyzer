interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ title, message, onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <div className="flex flex-col gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        <p>{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
