import React from 'react';
import { cn } from '../../lib/cn';

// Card Container
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseStyles = `
      bg-[var(--panel)] text-[var(--fg)]
      rounded-xl
      transition-all duration-200
    `;

    const variants = {
      default: 'border border-[var(--border)]',
      bordered: 'border-2 border-[var(--border)]',
      elevated: 'shadow-lg hover:shadow-xl'
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card Header
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4 border-b border-[var(--border)]',
          className
        )}
        {...props}
      />
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Title
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'text-lg font-semibold text-[var(--fg)]',
          className
        )}
        {...props}
      />
    );
  }
);

CardTitle.displayName = 'CardTitle';

// Card Description
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          'text-sm text-[var(--muted)] mt-1',
          className
        )}
        {...props}
      />
    );
  }
);

CardDescription.displayName = 'CardDescription';

// Card Content
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-6 py-4', className)}
        {...props}
      />
    );
  }
);

CardContent.displayName = 'CardContent';

// Card Footer
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4 border-t border-[var(--border)]',
          'flex items-center justify-end gap-2',
          className
        )}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
};