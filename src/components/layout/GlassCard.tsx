import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'light' | 'dark';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
}

export const GlassCard = ({ 
  children, 
  className,
  variant = 'light',
  blur = 'md',
  glow = false,
  ...props 
}: GlassCardProps) => {
  return (
    <div
      className={cn(
        'rounded-2xl p-6 transition-all duration-300',
        variant === 'light' ? 'glass' : 'glass-dark',
        `backdrop-blur-${blur}`,
        glow && 'glow hover:scale-[1.02]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;