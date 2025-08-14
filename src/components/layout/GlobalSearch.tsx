import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, Loader2, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  type: 'document' | 'article' | 'guide';
  path?: string;
}

export const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Mock search results - replace with actual API call
  const mockSearchResults: SearchResult[] = [
    {
      id: '1',
      title: 'Japan Visa Requirements',
      category: 'Destinations',
      excerpt: 'Complete guide to obtaining tourist and business visas for Japan...',
      type: 'document',
      path: '/knowledge'
    },
    {
      id: '2',
      title: 'Email Marketing Best Practices',
      category: 'Marketing',
      excerpt: 'Learn how to create effective email campaigns for travel agents...',
      type: 'guide',
      path: '/knowledge'
    },
    {
      id: '3',
      title: 'Delta Airlines Baggage Policy',
      category: 'Suppliers',
      excerpt: 'Updated baggage allowances and fees for Delta Airlines...',
      type: 'article',
      path: '/knowledge'
    }
  ];

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Perform search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Filter mock results based on query
    const filtered = mockSearchResults.filter(result =>
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.excerpt.toLowerCase().includes(query.toLowerCase()) ||
      result.category.toLowerCase().includes(query.toLowerCase())
    );
    
    setResults(filtered);
    setIsSearching(false);
  };

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    if (result.path) {
      navigate(result.path);
    }
  };

  const typeIcons = {
    document: '📄',
    article: '📰',
    guide: '📚'
  };

  const categoryColors = {
    Destinations: 'from-blue-500 to-cyan-500',
    Marketing: 'from-purple-500 to-pink-500',
    Suppliers: 'from-green-500 to-emerald-500',
    Sales: 'from-orange-500 to-red-500'
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-all group"
      >
        <Search size={16} className="text-primary group-hover:text-primary" />
        <span className="text-sm text-primary hidden sm:inline">Search</span>
        <kbd className="hidden md:flex items-center gap-1 px-2 py-0.5 text-xs rounded-lg bg-primary/10 text-primary/70 border border-primary/20">
          <Command size={10} />K
        </kbd>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed left-1/2 top-20 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
            >
              <div className="bg-gray-900 rounded-3xl shadow-2xl shadow-primary/20 ring-1 ring-primary/30 border border-primary/30 overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-4 p-6 border-b border-primary/20">
                  <Search size={20} className="text-primary" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search documents, guides, and articles..."
                    className="flex-1 bg-transparent outline-none text-lg placeholder:text-gray-400 text-white"
                  />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Search Results */}
                <div className="max-h-[400px] overflow-y-auto">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : results.length > 0 ? (
                    <div className="p-2">
                      {results.map((result, index) => (
                        <motion.button
                          key={result.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleResultClick(result)}
                          className="w-full p-4 rounded-2xl hover:bg-primary/10 transition-all text-left group"
                        >
                          <div className="flex items-start gap-4">
                            <span className="text-2xl">{typeIcons[result.type]}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold truncate">{result.title}</h4>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full bg-gradient-to-r text-white",
                                  categoryColors[result.category as keyof typeof categoryColors] || 'from-gray-500 to-gray-600'
                                )}>
                                  {result.category}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {result.excerpt}
                              </p>
                            </div>
                            <FileText size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="p-12 text-center">
                      <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                      <p className="text-sm text-muted-foreground/70 mt-2">
                        Try searching for destinations, suppliers, or marketing topics
                      </p>
                    </div>
                  ) : (
                    <div className="p-6">
                      <p className="text-sm text-muted-foreground mb-4">Quick searches</p>
                      <div className="flex flex-wrap gap-2">
                        {['Japan visa', 'Email templates', 'Delta baggage', 'France guide'].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleSearch(suggestion)}
                            className="px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-sm text-primary transition-colors border border-primary/20"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-primary/20 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-primary/10 text-primary/70 border border-primary/20">↵</kbd> to select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-primary/10 text-primary/70 border border-primary/20">↑↓</kbd> to navigate
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-primary/10 text-primary/70 border border-primary/20">esc</kbd> to close
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};