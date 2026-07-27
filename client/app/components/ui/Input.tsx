import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Optional id; generated label association when label is set. */
  id?: string;
  className?: string;
  wrapperClassName?: string;
  trailing?: ReactNode;
}

export default function Input({
  label,
  hint,
  error,
  id,
  className = '',
  wrapperClassName = '',
  trailing,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className={`flex flex-col gap-1.5 text-sm ${wrapperClassName}`}>
      {label ? <span className="font-medium text-zinc-900">{label}</span> : null}
      <span className="relative flex items-center">
        <input
          id={inputId}
          className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60 ${
            error ? 'border-red-300 focus:ring-red-300' : 'border-zinc-300'
          } ${trailing ? 'pr-10' : ''} ${className}`}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {trailing ? (
          <span className="pointer-events-none absolute right-3 text-zinc-400">{trailing}</span>
        ) : null}
      </span>
      {error ? (
        <span id={`${inputId}-error`} className="text-xs text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="text-xs text-zinc-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
