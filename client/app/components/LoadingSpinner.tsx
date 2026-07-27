interface LoadingSpinnerProps {
  className?: string;
  label?: string;
}

export default function LoadingSpinner({
  className = 'h-5 w-5',
  label = 'Loading',
}: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}
