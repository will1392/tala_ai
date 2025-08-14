import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  size = 'md',
  className 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-colors';
  
  const variants = {
    default: 'bg-white/10 text-white hover:bg-white/20',
    primary: 'bg-primary/20 text-primary hover:bg-primary/30',
    secondary: 'bg-secondary/20 text-secondary hover:bg-secondary/30',
    outline: 'border border-white/20 text-white/80 hover:bg-white/10',
    success: 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
    warning: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30',
    danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};