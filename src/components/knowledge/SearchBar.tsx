import { useState, useCallback } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface SearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
  isSearching?: boolean;
}

export const SearchBar = ({ onSearch, disabled = false, isSearching = false }: SearchBarProps) => {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!disabled && value.trim()) {
      onSearch(value.trim());
    }
  }, [value, onSearch, disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled && value.trim()) {
      onSearch(value.trim());
    }
  }, [value, onSearch, disabled]);

  const handleAISearch = useCallback(() => {
    if (!disabled && value.trim()) {
      onSearch(value.trim());
    }
  }, [value, onSearch, disabled]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <form onSubmit={handleSubmit}>
        <div className="relative group">
          <Search className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
            isSearching ? "text-primary animate-pulse" : "text-white/50 group-focus-within:text-primary"
          )} size={20} />
          
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Initializing..." : "Search documents, visa requirements, airline policies..."}
            disabled={disabled}
            className={cn(
              'w-full pl-12 pr-32 py-4 rounded-2xl text-lg transition-all',
              'glass-input',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary-900',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isSearching && 'ring-2 ring-primary/50'
            )}
          />
          
          <button 
            type="button"
            onClick={handleAISearch}
            disabled={disabled || !value.trim() || isSearching}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl font-medium",
              "flex items-center gap-2 transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isSearching 
                ? "bg-primary/80 text-secondary-900" 
                : "bg-primary text-secondary-900 hover:bg-primary-dark"
            )}
          >
            {isSearching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Searching
              </>
            ) : (
              <>
                <Sparkles size={16} />
                AI Search
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* Search suggestions could be added here in the future */}
    </motion.div>
  );
};