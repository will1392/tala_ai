import { motion } from 'framer-motion';
import { Search, Clock, Folder, Tag, FileText, X } from 'lucide-react';

interface SearchResultsSummaryProps {
  query: string;
  totalResults: number;
  processingTime: number;
  currentFolder?: { id: string; name: string } | null;
  activeFilters?: Array<{ id: string; label: string; value: string; type: string }>;
  onClearSearch: () => void;
  onRemoveFilter?: (filterId: string) => void;
}

export const SearchResultsSummary = ({
  query,
  totalResults,
  processingTime,
  currentFolder,
  activeFilters = [],
  onClearSearch,
  onRemoveFilter
}: SearchResultsSummaryProps) => {
  if (!query) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass-dark rounded-xl p-4 border border-white/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Search Query */}
          <div className="flex items-center gap-3 mb-2">
            <Search size={18} className="text-primary" />
            <div>
              <span className="text-white font-medium">
                Searching for: <span className="text-primary">"{query}"</span>
              </span>
              {currentFolder && currentFolder.id !== 'all' && (
                <div className="flex items-center gap-2 mt-1 text-sm text-white/70">
                  <Folder size={14} className="text-primary" />
                  <span>in <span className="text-primary">{currentFolder.name}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Results Info */}
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1">
              <FileText size={14} />
              {totalResults} {totalResults === 1 ? 'result' : 'results'}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {processingTime}ms
            </span>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <Tag size={14} className="text-white/60" />
              <span className="text-xs text-white/60">Filters:</span>
              <div className="flex flex-wrap gap-1">
                {activeFilters.map(filter => (
                  <motion.div
                    key={filter.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 px-2 py-1 bg-primary/20 border border-primary/30 rounded-md text-xs"
                  >
                    <span>{filter.label}</span>
                    {onRemoveFilter && (
                      <button
                        onClick={() => onRemoveFilter(filter.id)}
                        className="text-primary hover:text-primary-dark transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clear Search */}
        <button
          onClick={onClearSearch}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
          title="Clear search"
        >
          <X size={18} />
        </button>
      </div>

      {/* Search Tips */}
      {totalResults === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
        >
          <div className="text-sm text-yellow-200">
            <p className="font-medium mb-1">No results found. Try:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-yellow-200/80">
              <li>Using different keywords or synonyms</li>
              <li>Checking spelling and removing filters</li>
              <li>Searching in a different folder</li>
              <li>Using broader search terms</li>
            </ul>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};