'use client';

import { useEffect, useId, type ReactNode } from 'react';
import Button from '@/app/components/ui/Button';

export interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Optional footer actions (e.g. Cancel). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Accessible modal dialog with overlay.
 * Closes on Escape and backdrop click.
 */
export default function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  className = '',
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg ${className}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-zinc-900">
            {title}
          </h2>
          <Button type="button" variant="outline" className="px-2.5! py-1!" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
