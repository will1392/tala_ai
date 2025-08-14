import React from 'react';
import { cn } from '../../utils/cn';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({ 
  value, 
  max = 100, 
  className,
  indicatorClassName 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-white/10',
        className
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn(
          'h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300 ease-out',
          indicatorClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};