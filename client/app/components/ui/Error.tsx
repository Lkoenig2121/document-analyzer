import ErrorMessage from '@/app/components/ui/ErrorMessage';

export interface ErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

/** Curriculum alias for ErrorMessage. */
export default function Error({ title, message, onRetry }: ErrorProps) {
  return <ErrorMessage title={title} message={message} onRetry={onRetry} />;
}
