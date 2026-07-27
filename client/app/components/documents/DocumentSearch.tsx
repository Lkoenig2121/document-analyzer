'use client';

import Input from '@/app/components/ui/Input';

interface DocumentSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function DocumentSearch({
  value,
  onChange,
  placeholder = 'Search documents...',
}: DocumentSearchProps) {
  return (
    <Input
      type="search"
      aria-label="Search documents"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-lg py-2.5"
    />
  );
}
