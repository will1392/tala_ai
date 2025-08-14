import React from 'react';
import { cn } from '../../lib/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  placeholder?: string;
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, placeholder, options, ...props }, ref) => {
    const baseStyles = `
      w-full min-h-[44px] px-4 py-2 pr-10
      bg-[var(--bg)] text-[var(--fg)]
      border border-[var(--border)]
      rounded-xl
      appearance-none cursor-pointer
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent
      disabled:cursor-not-allowed disabled:opacity-50
    `;

    const errorStyles = error ? 'border-red-500 focus:ring-red-500' : '';

    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(baseStyles, errorStyles, className)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };