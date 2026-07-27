import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import LoadingSpinner from '../LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface SharedButtonProps {
  variant?: ButtonVariant;
  isLoading?: boolean;
  loadingText?: string;
  children: ReactNode;
  className?: string;
}

export type ButtonProps =
  | (SharedButtonProps &
      ButtonHTMLAttributes<HTMLButtonElement> & {
        href?: undefined;
      })
  | (SharedButtonProps &
      AnchorHTMLAttributes<HTMLAnchorElement> & {
        href: string;
      });

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:hover:bg-zinc-900',
  secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:hover:bg-zinc-100',
  outline:
    'border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:hover:bg-white',
};

export default function Button({
  variant = 'primary',
  isLoading = false,
  loadingText,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`;

  if ('href' in props && props.href) {
    const { href, ...anchorProps } = props;
    return (
      <a href={href} className={classes} {...anchorProps}>
        {children}
      </a>
    );
  }

  const buttonProps = props as SharedButtonProps & ButtonHTMLAttributes<HTMLButtonElement>;
  const { disabled, type = 'button', ...restButtonProps } = buttonProps;
  const isDisabled = Boolean(disabled) || isLoading;

  return (
    <button type={type} disabled={isDisabled} className={classes} {...restButtonProps}>
      {isLoading ? (
        <>
          <LoadingSpinner className="h-4 w-4" label={loadingText ?? 'Loading'} />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
