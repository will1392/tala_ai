import React from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, startIcon, endIcon, error, ...props }, ref) => {
    const baseStyles = `
      w-full min-h-[44px] px-4 py-2
      bg-[var(--bg)] text-[var(--fg)]
      border border-[var(--border)]
      rounded-xl
      transition-colors duration-200
      placeholder:text-[var(--muted)]
      focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent
      disabled:cursor-not-allowed disabled:opacity-50
    `;

    const errorStyles = error ? 'border-red-500 focus:ring-red-500' : '';

    if (startIcon || endIcon) {
      return (
        <div className="relative">
          {startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              baseStyles,
              errorStyles,
              startIcon && 'pl-10',
              endIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
              {endIcon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(baseStyles, errorStyles, className)}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };