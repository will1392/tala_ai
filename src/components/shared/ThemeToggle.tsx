import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContextNew';
import { cn } from '../../utils/cn';

interface ThemeToggleProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className, 
  variant = 'default' 
}) => {
  const { theme, toggle } = useTheme();
  
  if (variant === 'compact') {
    return (
      <button
        aria-label="Toggle theme"
        onClick={toggle}
        className={cn(
          "p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary/60 focus:ring-2 focus:ring-primary/50 transition-colors",
          className
        )}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  }
  
  // Default variant - same as compact for simplicity
  return (
    <button
      aria-label="Toggle theme"
      onClick={toggle}
      className={cn(
        "rounded-xl border border-gray-200 dark:border-gray-700 p-2 hover:border-primary/60 focus:ring-2 focus:ring-primary/50 transition-colors",
        className
      )}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};