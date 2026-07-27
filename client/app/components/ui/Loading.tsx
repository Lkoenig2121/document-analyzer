import LoadingState from '@/app/components/ui/LoadingState';

export interface LoadingProps {
  message?: string;
}

/** Curriculum alias for LoadingState. */
export default function Loading({ message = 'Loading...' }: LoadingProps) {
  return <LoadingState message={message} />;
}
