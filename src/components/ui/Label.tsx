import React from 'react';
import { cn } from '../../lib/cn';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  error?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, error, ...props }, ref) => {
    const baseStyles = `
      block text-sm font-medium text-[var(--fg)]
      mb-1.5 transition-colors duration-200
    `;

    const errorStyles = error ? 'text-red-500' : '';

    return (
      <label
        ref={ref}
        className={cn(baseStyles, errorStyles, className)}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-red-500" aria-label="required">
            *
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';

export { Label };