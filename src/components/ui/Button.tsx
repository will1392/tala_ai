import React from 'react';
import { cn } from '../../lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, asChild = false, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium transition-colors
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]
      disabled:pointer-events-none disabled:opacity-50
      rounded-xl min-h-[44px]
    `;

    const variants = {
      primary: `
        bg-[var(--primary)] text-white
        hover:bg-[var(--primary)]/90
        active:bg-[var(--primary)]/80
      `,
      secondary: `
        bg-[var(--panel)] text-[var(--fg)]
        border border-[var(--border)]
        hover:bg-[var(--muted)]
        active:bg-[var(--muted)]/80
      `,
      ghost: `
        bg-transparent text-[var(--fg)]
        hover:bg-[var(--muted)]
        active:bg-[var(--muted)]/80
      `,
      destructive: `
        bg-red-600 text-white
        hover:bg-red-700
        active:bg-red-800
      `
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5'
    };

    const Comp = asChild ? React.Fragment : 'button';
    const buttonProps = asChild ? {} : { ref, ...props };

    return (
      <Comp
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...buttonProps}
      >
        {children}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button };