import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  X, 
  Folder, 
  FileText, 
  FolderOpen,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';
import { comprehensiveSearchService, type SearchResult, type SearchOptions } from '../../services/comprehensiveSearchService';
import type { PrimaryFolder } from '../../types/primaryFolder';

interface ComprehensiveSearchInterfaceProps {
  onResultSelect: (result: SearchResult) => void;
  onFolderNavigate?: (folderId: string, type: 'primary' | 'subfolder') => void;
  primaryFolders: PrimaryFolder[];
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
}

export const ComprehensiveSearchInterface = ({
  onResultSelect,
  onFolderNavigate,
  isOpen,
  onClose,
  placeholder = "Search documents, folders, and content..."
}: ComprehensiveSearchInterfaceProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);

  // Search filters
  const [filters, setFilters] = useState({
    type: [] as ('document' | 'primary-folder' | 'subfolder')[],
    category: '',
    dateRange: { start: undefined as Date | undefined, end: undefined as Date | undefined },
    hasDocuments: undefined as boolean | undefined,
    minDocumentCount: 0
  });

  // Search options
  const [sortBy, setSortBy] = useState<'relevance' | 'title' | 'date' | 'documentCount'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Focus input when modal opens and refresh search index
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Refresh search index when modal opens
      comprehensiveSearchService.refreshIndex('admin-1', true).catch(console.error);
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      const searchOptions: SearchOptions = {
        query: searchQuery,
        filters: {
          type: filters.type.length > 0 ? filters.type : undefined,
          category: filters.category || undefined,
          dateRange: filters.dateRange.start || filters.dateRange.end ? filters.dateRange : undefined,
          hasDocuments: filters.hasDocuments,
          minDocumentCount: filters.minDocumentCount > 0 ? filters.minDocumentCount : undefined
        },
        sortBy,
        sortOrder,
        limit: 20,
        highlightMatches: true
      };

      const result = await comprehensiveSearchService.search(searchOptions);
      
      setResults(result.results);
      setSuggestions(result.suggestions);
      setTotalResults(result.totalResults);
      setProcessingTime(result.processingTime);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [filters, sortBy, sortOrder]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    if (query.trim()) {
      performSearch(query);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setTotalResults(0);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'document') {
      onResultSelect(result);
    } else if (onFolderNavigate) {
      onFolderNavigate(result.id, result.type === 'primary-folder' ? 'primary' : 'subfolder');
    }
    onClose();
  };

  const getResultIcon = (result: SearchResult) => {
    switch (result.type) {
      case 'primary-folder':
        return <FolderOpen size={20} className="text-primary" />;
      case 'subfolder':
        return <Folder size={20} className="text-blue-400" />;
      case 'document':
        return <FileText size={20} className="text-white/70" />;
      default:
        return <FileText size={20} className="text-white/70" />;
    }
  };

  const getMatchTypeColor = (matchType: SearchResult['matchType']) => {
    switch (matchType) {
      case 'title': return 'text-green-400';
      case 'description': return 'text-blue-400';
      case 'content': return 'text-yellow-400';
      case 'metadata': return 'text-purple-400';
      case 'tag': return 'text-pink-400';
      default: return 'text-white/60';
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: -20 }}
        className="w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-dark rounded-2xl border border-white/10 overflow-hidden">
          {/* Search Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {query && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-3",
                  showFilters && "bg-primary/20 text-primary"
                )}
              >
                <Filter size={18} />
              </Button>

              <Button variant="ghost" size="sm" onClick={onClose} className="p-3">
                <X size={18} />
              </Button>
            </div>

            {/* Search Stats */}
            {(totalResults > 0 || processingTime > 0) && (
              <div className="flex items-center justify-between mt-4 text-sm text-white/60">
                <span>
                  {totalResults > 0 && `${totalResults} results found`}
                </span>
                <span>
                  {processingTime > 0 && `Search completed in ${processingTime}ms`}
                </span>
              </div>
            )}
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-white/10 overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Content Type
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'document', label: 'Documents', icon: <FileText size={16} /> },
                          { value: 'primary-folder', label: 'Categories', icon: <FolderOpen size={16} /> },
                          { value: 'subfolder', label: 'Folders', icon: <Folder size={16} /> }
                        ].map(({ value, label, icon }) => (
                          <label key={value} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={filters.type.includes(value as any)}
                              onChange={(e) => {
                                const newTypes = e.target.checked
                                  ? [...filters.type, value as any]
                                  : filters.type.filter(t => t !== value);
                                handleFilterChange({ ...filters, type: newTypes });
                              }}
                              className="rounded border-white/20"
                            />
                            {icon}
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange({ ...filters, category: e.target.value })}
                        className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white"
                      >
                        <option value="">All Categories</option>
                        <option value="visa">Visa Documents</option>
                        <option value="airline">Airlines</option>
                        <option value="destination">Destinations</option>
                        <option value="agency">Agency</option>
                        <option value="general">General</option>
                      </select>
                    </div>

                    {/* Sort Options */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Sort By
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="flex-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                        >
                          <option value="relevance">Relevance</option>
                          <option value="title">Title</option>
                          <option value="date">Date</option>
                          <option value="documentCount">Document Count</option>
                        </select>
                        <button
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
                        >
                          {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-white/70">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                  <span>Searching...</span>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="p-6 space-y-3">
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleResultClick(result)}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all group"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getResultIcon(result)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 
                            className="font-medium text-white group-hover:text-primary transition-colors"
                            dangerouslySetInnerHTML={{ 
                              __html: result.highlightedTitle || result.title 
                            }}
                          />
                          
                          {result.highlightedDescription && (
                            <p 
                              className="text-sm text-white/70 mt-1"
                              dangerouslySetInnerHTML={{ 
                                __html: result.highlightedDescription 
                              }}
                            />
                          )}
                          
                          {result.highlightedContent && result.type === 'document' && (
                            <p 
                              className="text-xs text-white/60 mt-2"
                              dangerouslySetInnerHTML={{ 
                                __html: result.highlightedContent 
                              }}
                            />
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className={cn("text-xs", getMatchTypeColor(result.matchType))}>
                            {result.matchType}
                          </div>
                          {result.metadata.documentCount !== undefined && (
                            <div className="text-xs text-white/50 mt-1">
                              {result.metadata.documentCount} docs
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {result.metadata.folderPath && result.metadata.folderPath.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-white/50">
                          <Folder size={12} />
                          {result.metadata.folderPath.join(' > ')}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : query && !isSearching ? (
              <div className="text-center py-12 text-white/60">
                <Search size={32} className="mx-auto mb-3 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-1">Try adjusting your search terms or filters</p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="p-6">
                <h4 className="text-sm font-medium text-white/80 mb-3">Suggestions</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};