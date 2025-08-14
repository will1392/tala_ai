import React from 'react';
import { cn } from '../../lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const baseStyles = `
      w-full min-h-[44px] px-4 py-2
      bg-[var(--bg)] text-[var(--fg)]
      border border-[var(--border)]
      rounded-xl
      resize-vertical
      transition-colors duration-200
      placeholder:text-[var(--muted)]
      focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent
      disabled:cursor-not-allowed disabled:opacity-50
    `;

    const errorStyles = error ? 'border-red-500 focus:ring-red-500' : '';

    return (
      <textarea
        ref={ref}
        className={cn(baseStyles, errorStyles, className)}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };