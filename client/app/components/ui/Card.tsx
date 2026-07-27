import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <article
      className={`rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </article>
  );
}
