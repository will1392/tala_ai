import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    children,
    disabled,
    ...props 
  }, ref) => {
    const variants = {
      primary: 'bg-primary hover:bg-primary-dark text-secondary-900 font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] border border-primary/20',
      secondary: 'bg-secondary hover:bg-secondary-light text-white',
      ghost: 'bg-transparent hover:bg-white/10 text-white',
      glass: 'glass-button text-white',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'rounded-xl transition-all duration-300 flex items-center justify-center gap-2',
          'disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-lg disabled:shadow-primary/20',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary-900',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" size={18} />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;