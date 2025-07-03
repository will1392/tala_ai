/**
 * Tag Filter Component
 * Allows users to filter content by tags with advanced filtering options
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  Tag as TagIcon, 
  X, 
  Check,
  ChevronDown,
  Search,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';
import { tagService } from '../../services/tagService';
import type { Tag, TagCategory, TagFilter as TagFilterType } from '../../types/tags';
import { getCategoryDisplayName } from '../../types/tags';

interface TagFilterProps {
  onFilterChange: (filter: TagFilterType | null) => void;
  className?: string;
  showClearButton?: boolean;
  maxVisibleTags?: number;
}

export const TagFilter = ({ 
  onFilterChange, 
  className,
  showClearButton = true,
  maxVisibleTags = 10
}: TagFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<TagCategory[]>([]);
  const [includeMode, setIncludeMode] = useState<'any' | 'all'>('any');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tagStats, setTagStats] = useState<Array<{ tag: Tag; usage_count: number }>>([]);

  // Load tags and stats
  useEffect(() => {
    loadTags();
    loadTagStats();
  }, []);

  // Update filter when selections change
  useEffect(() => {
    if (selectedTags.length > 0 || selectedCategories.length > 0) {
      const filter: TagFilterType = {
        tags: selectedTags.map(tag => tag.id),
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        include_mode: includeMode
      };
      onFilterChange(filter);
    } else {
      onFilterChange(null);
    }
  }, [selectedTags, selectedCategories, includeMode, onFilterChange]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const tags = await tagService.getAllTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTagStats = async () => {
    try {
      const stats = await tagService.getTagUsageStats();
      setTagStats(stats);
    } catch (error) {
      console.error('Failed to load tag stats:', error);
    }
  };

  const getTagUsageCount = (tagId: string): number => {
    const stat = tagStats.find(s => s.tag.id === tagId);
    return stat?.usage_count || 0;
  };

  const handleTagToggle = (tag: Tag) => {
    setSelectedTags(prev => {
      const isSelected = prev.some(t => t.id === tag.id);
      if (isSelected) {
        return prev.filter(t => t.id !== tag.id);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleCategoryToggle = (category: TagCategory) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(category);
      if (isSelected) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedCategories([]);
    setSearchQuery('');
  };

  const filteredTags = availableTags.filter(tag => {
    if (searchQuery) {
      return tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             tag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const popularTags = tagStats
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, maxVisibleTags)
    .map(stat => stat.tag);

  const hasActiveFilters = selectedTags.length > 0 || selectedCategories.length > 0;

  return (
    <div className={cn("relative", className)}>
      {/* Filter Button */}
      <Button
        variant={hasActiveFilters ? "primary" : "glass"}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2",
          hasActiveFilters && "ring-2 ring-primary/30"
        )}
      >
        <Filter size={16} />
        <span className="hidden sm:inline">Filter by Tags</span>
        {hasActiveFilters && (
          <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
            {selectedTags.length + selectedCategories.length}
          </span>
        )}
        <ChevronDown 
          size={14} 
          className={cn(
            "transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </Button>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1 mt-2">
          {/* Selected Tags */}
          {selectedTags.map(tag => (
            <TagChip
              key={tag.id}
              tag={tag}
              onRemove={() => handleTagToggle(tag)}
              showUsageCount={false}
            />
          ))}
          
          {/* Selected Categories */}
          {selectedCategories.map(category => (
            <CategoryChip
              key={category}
              category={category}
              onRemove={() => handleCategoryToggle(category)}
            />
          ))}

          {/* Clear All Button */}
          {showClearButton && (
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Filter Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 glass-dark border border-white/10 rounded-lg shadow-xl z-50 min-w-80"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white">Filter by Tags</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Include Mode Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70">Match:</span>
                <button
                  onClick={() => setIncludeMode(includeMode === 'any' ? 'all' : 'any')}
                  className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {includeMode === 'any' ? (
                    <ToggleLeft className="text-primary" size={16} />
                  ) : (
                    <ToggleRight className="text-primary" size={16} />
                  )}
                  <span className="text-sm text-white">
                    {includeMode === 'any' ? 'Any tag' : 'All tags'}
                  </span>
                </button>
              </div>

              {/* Search */}
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Categories Section */}
            <div className="p-4 border-b border-white/10">
              <h4 className="text-sm font-medium text-white/80 mb-3">Categories</h4>
              <div className="grid grid-cols-2 gap-2">
                {['visa_info', 'hotel_info', 'restaurant_type', 'supplier_type', 'document_type', 'destination', 'activity_type', 'transportation'].map(category => (
                  <CategoryOption
                    key={category}
                    category={category as TagCategory}
                    selected={selectedCategories.includes(category as TagCategory)}
                    onToggle={() => handleCategoryToggle(category as TagCategory)}
                  />
                ))}
              </div>
            </div>

            {/* Tags Section */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="p-4">
                  {!searchQuery && popularTags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-white/80 mb-3">Popular Tags</h4>
                      <div className="space-y-1">
                        {popularTags.map(tag => (
                          <TagOption
                            key={tag.id}
                            tag={tag}
                            selected={selectedTags.some(t => t.id === tag.id)}
                            onToggle={() => handleTagToggle(tag)}
                            usageCount={getTagUsageCount(tag.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {searchQuery && (
                    <div>
                      <h4 className="text-sm font-medium text-white/80 mb-3">
                        Search Results ({filteredTags.length})
                      </h4>
                      <div className="space-y-1">
                        {filteredTags.map(tag => (
                          <TagOption
                            key={tag.id}
                            tag={tag}
                            selected={selectedTags.some(t => t.id === tag.id)}
                            onToggle={() => handleTagToggle(tag)}
                            usageCount={getTagUsageCount(tag.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredTags.length === 0 && searchQuery && (
                    <div className="text-center py-8 text-white/60">
                      <TagIcon size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No tags found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-white/60">
                {selectedTags.length + selectedCategories.length} filters active
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear All
                </Button>
                <Button variant="primary" size="sm" onClick={() => setIsOpen(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface TagChipProps {
  tag: Tag;
  onRemove: () => void;
  showUsageCount?: boolean;
}

const TagChip = ({ tag, onRemove }: TagChipProps) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer"
    style={{ borderColor: tag.color + '40', backgroundColor: tag.color + '20' }}
  >
    <div 
      className="w-2 h-2 rounded-full flex-shrink-0" 
      style={{ backgroundColor: tag.color }}
    />
    <span className="truncate max-w-20">{tag.name}</span>
    <button
      onClick={onRemove}
      className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
    >
      <X size={10} />
    </button>
  </motion.div>
);

interface CategoryChipProps {
  category: TagCategory;
  onRemove: () => void;
}

const CategoryChip = ({ category, onRemove }: CategoryChipProps) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/20 border border-primary/30 text-primary-light hover:bg-primary/30 cursor-pointer"
  >
    <span className="truncate max-w-24">{getCategoryDisplayName(category)}</span>
    <button
      onClick={onRemove}
      className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
    >
      <X size={10} />
    </button>
  </motion.div>
);

interface TagOptionProps {
  tag: Tag;
  selected: boolean;
  onToggle: () => void;
  usageCount?: number;
}

const TagOption = ({ tag, selected, onToggle, usageCount }: TagOptionProps) => (
  <motion.button
    whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
    onClick={onToggle}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
      selected ? "bg-primary/20 border border-primary/30" : "hover:bg-white/5"
    )}
  >
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div 
        className="w-3 h-3 rounded-full flex-shrink-0" 
        style={{ backgroundColor: tag.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{tag.name}</div>
        {tag.description && (
          <div className="text-xs text-white/60 truncate">{tag.description}</div>
        )}
      </div>
    </div>
    
    <div className="flex items-center gap-2 flex-shrink-0">
      {usageCount !== undefined && (
        <span className="text-xs text-white/50">{usageCount}</span>
      )}
      {selected && <Check size={14} className="text-primary" />}
    </div>
  </motion.button>
);

interface CategoryOptionProps {
  category: TagCategory;
  selected: boolean;
  onToggle: () => void;
}

const CategoryOption = ({ category, selected, onToggle }: CategoryOptionProps) => (
  <motion.button
    whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
    onClick={onToggle}
    className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-sm",
      selected ? "bg-primary/20 border border-primary/30 text-primary-light" : "hover:bg-white/5 text-white/80"
    )}
  >
    <span className="truncate">{getCategoryDisplayName(category)}</span>
    {selected && <Check size={12} className="text-primary flex-shrink-0" />}
  </motion.button>
);