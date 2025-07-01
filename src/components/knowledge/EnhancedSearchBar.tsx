import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Sparkles, Loader2, Filter, X, Clock, TrendingUp, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { SearchSuggestionsService, type SearchSuggestion } from '../../services/searchSuggestions';

interface SearchFilter {
  id: string;
  label: string;
  value: string;
  type: 'category' | 'fileType' | 'dateRange';
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'folder';
  icon?: string;
  metadata?: string;
}

interface EnhancedSearchBarProps {
  onSearch: (query: string, filters?: any) => void;
  disabled?: boolean;
  isSearching?: boolean;
  currentFolder?: { id: string; name: string } | null;
  recentSearches?: string[];
  folders?: Array<{ id: string; name: string; documentCount: number }>;
}

export const EnhancedSearchBar = ({ 
  onSearch, 
  disabled = false, 
  isSearching = false,
  currentFolder,
  recentSearches = [],
  folders = []
}: EnhancedSearchBarProps) => {
  const [value, setValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sample filters - these could be dynamic based on available data
  const availableFilters: SearchFilter[] = [
    { id: 'category-visa', label: 'Visa Documents', value: 'visa', type: 'category' },
    { id: 'category-airline', label: 'Airline Policies', value: 'airline', type: 'category' },
    { id: 'category-destination', label: 'Destination Guides', value: 'destination', type: 'category' },
    { id: 'filetype-pdf', label: 'PDF Files', value: 'application/pdf', type: 'fileType' },
    { id: 'filetype-word', label: 'Word Documents', value: 'application/msword', type: 'fileType' },
  ];

  // Get intelligent suggestions based on current context
  const allSuggestions = SearchSuggestionsService.getSuggestions(
    value,
    recentSearches,
    currentFolder,
    folders
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!disabled && value.trim()) {
      const filters = activeFilters.reduce((acc, filter) => {
        if (filter.type === 'category') {
          acc.category = filter.value;
        } else if (filter.type === 'fileType') {
          acc.fileType = filter.value;
        }
        return acc;
      }, {} as any);
      
      onSearch(value.trim(), filters);
      setShowDropdown(false);
    }
  }, [value, onSearch, disabled, activeFilters]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setShowDropdown(true);
  }, []);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    setValue(suggestion.text);
    onSearch(suggestion.text);
    setShowDropdown(false);
  }, [onSearch]);

  const handleFilterToggle = useCallback((filter: SearchFilter) => {
    setActiveFilters(prev => {
      const exists = prev.find(f => f.id === filter.id);
      if (exists) {
        return prev.filter(f => f.id !== filter.id);
      } else {
        // Remove other filters of the same type
        const filtered = prev.filter(f => f.type !== filter.type);
        return [...filtered, filter];
      }
    });
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  const clearSearch = useCallback(() => {
    setValue('');
    setActiveFilters([]);
    onSearch('');
    setShowDropdown(false);
  }, [onSearch]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
      ref={dropdownRef}
    >
      {/* Current folder indicator */}
      {currentFolder && currentFolder.id !== 'all' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-3 flex items-center gap-2 text-sm text-white/70"
        >
          <Folder size={16} className="text-primary" />
          <span>Searching in: <span className="text-primary font-medium">{currentFolder.name}</span></span>
        </motion.div>
      )}

      {/* Active filters */}
      <AnimatePresence>
        {activeFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 flex flex-wrap gap-2"
          >
            {activeFilters.map(filter => (
              <motion.div
                key={filter.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-sm"
              >
                <span>{filter.label}</span>
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="text-primary hover:text-primary-dark transition-colors"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit}>
        <div className="relative group">
          <Search className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10",
            isSearching ? "text-primary animate-pulse" : "text-white/50 group-focus-within:text-primary"
          )} size={20} />
          
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={handleInputChange}
            onFocus={() => setShowDropdown(true)}
            placeholder={disabled ? "Initializing..." : currentFolder && currentFolder.id !== 'all' 
              ? `Search in ${currentFolder.name}...` 
              : "Search documents, visa requirements, airline policies..."
            }
            disabled={disabled}
            className={cn(
              'w-full pl-12 pr-40 py-4 rounded-2xl text-lg transition-all',
              'glass-input',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary-900',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isSearching && 'ring-2 ring-primary/50',
              showDropdown && 'rounded-b-none border-b-0'
            )}
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2 rounded-lg transition-all",
                "hover:bg-white/10",
                activeFilters.length > 0 ? "text-primary bg-primary/20" : "text-white/60"
              )}
            >
              <Filter size={16} />
            </button>

            {/* Clear search */}
            {value && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={16} />
              </button>
            )}

            {/* AI Search button */}
            <button 
              type="submit"
              disabled={disabled || !value.trim() || isSearching}
              className={cn(
                "px-4 py-2 rounded-xl font-medium",
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
        </div>
      </form>

      {/* Dropdown with suggestions and filters */}
      <AnimatePresence>
        {showDropdown && (allSuggestions.length > 0 || showFilters) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border border-white/20 rounded-b-2xl shadow-xl z-50 overflow-hidden"
          >
            {/* Filters section */}
            {showFilters && (
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {availableFilters.map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => handleFilterToggle(filter)}
                      className={cn(
                        "text-left px-3 py-2 rounded-lg text-sm transition-all",
                        activeFilters.find(f => f.id === filter.id)
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "hover:bg-gray-100 text-gray-700"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions section */}
            {allSuggestions.length > 0 && (
              <div className="max-h-64 overflow-y-auto">
                {allSuggestions.map(suggestion => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors flex items-center gap-3"
                  >
                    <span className="text-lg">{suggestion.icon}</span>
                    <div className="flex-1">
                      <div className="text-gray-900">{suggestion.text}</div>
                      {suggestion.metadata && (
                        <div className="text-xs text-gray-500">{suggestion.metadata}</div>
                      )}
                    </div>
                    {suggestion.type === 'recent' && <Clock size={14} className="text-gray-400" />}
                    {suggestion.type === 'popular' && <TrendingUp size={14} className="text-orange-500" />}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};