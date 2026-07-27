import LoadingSpinner from '../LoadingSpinner';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600" role="status">
      <LoadingSpinner className="h-4 w-4" label={message} />
      <span>{message}</span>
    </div>
  );
}
