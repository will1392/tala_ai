/**
 * Tag Selector Component
 * Interface for selecting and assigning tags to documents, folders, etc.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tag as TagIcon, 
  Plus, 
  X, 
  ChevronDown
} from 'lucide-react';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';
import { tagService } from '../../services/tagService';
import type { Tag, TagCategory, TaggableItem } from '../../types/tags';
import { getCategoryDisplayName } from '../../types/tags';

interface TagSelectorProps {
  itemId: string;
  itemType: TaggableItem['type'];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxTags?: number;
  showCreateButton?: boolean;
}

export const TagSelector = ({
  itemId,
  itemType,
  selectedTags,
  onTagsChange,
  placeholder = "Search and select tags...",
  className,
  disabled = false,
  maxTags,
  showCreateButton = true
}: TagSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TagCategory | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available tags
  useEffect(() => {
    loadTags();
  }, []);

  // Filter tags based on search and category
  useEffect(() => {
    let filtered = availableTags.filter(tag => 
      !selectedTags.some(selected => selected.id === tag.id)
    );

    if (searchQuery) {
      filtered = filtered.filter(tag => 
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tag => tag.category === selectedCategory);
    }

    setFilteredTags(filtered);
  }, [availableTags, selectedTags, searchQuery, selectedCategory]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleTagSelect = async (tag: Tag) => {
    if (maxTags && selectedTags.length >= maxTags) {
      return;
    }

    const newTags = [...selectedTags, tag];
    onTagsChange(newTags);

    // Update backend
    try {
      await tagService.updateItemTags(
        itemId,
        itemType,
        newTags.map(t => t.id)
      );
    } catch (error) {
      console.error('Failed to update item tags:', error);
    }

    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleTagRemove = async (tagToRemove: Tag) => {
    const newTags = selectedTags.filter(tag => tag.id !== tagToRemove.id);
    onTagsChange(newTags);

    // Update backend
    try {
      await tagService.updateItemTags(
        itemId,
        itemType,
        newTags.map(t => t.id)
      );
    } catch (error) {
      console.error('Failed to update item tags:', error);
    }
  };

  const handleCreateTag = async (name: string, category: TagCategory) => {
    try {
      const newTag = await tagService.createTag({
        name,
        category,
        description: `Custom tag for ${itemType}`
      });
      
      await loadTags();
      await handleTagSelect(newTag);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };


  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedTags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              onRemove={() => handleTagRemove(tag)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 border rounded-lg transition-all cursor-text",
            "bg-white/5 border-white/10 hover:border-white/20",
            isOpen && "border-primary ring-2 ring-primary/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && setIsOpen(true)}
        >
          <TagIcon size={16} className="text-white/50 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedTags.length === 0 ? placeholder : "Add more tags..."}
            className="flex-1 bg-transparent text-white placeholder-white/50 focus:outline-none"
            disabled={disabled}
          />
          <ChevronDown 
            size={16} 
            className={cn(
              "text-white/50 transition-transform",
              isOpen && "transform rotate-180"
            )} 
          />
        </div>

        {/* Tag Limit Warning */}
        {maxTags && selectedTags.length >= maxTags && (
          <p className="text-xs text-yellow-400 mt-1">
            Maximum {maxTags} tags allowed
          </p>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 glass-dark border border-white/10 rounded-lg shadow-xl z-50 max-h-80 overflow-hidden"
          >
            {/* Search and Filter Header */}
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as TagCategory | 'all')}
                  className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Categories</option>
                  {['visa_info', 'hotel_info', 'restaurant_type', 'supplier_type', 'document_type', 'destination', 'activity_type', 'transportation', 'custom'].map(category => (
                    <option key={category} value={category}>
                      {getCategoryDisplayName(category as TagCategory)}
                    </option>
                  ))}
                </select>

                {showCreateButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateForm(true)}
                    className="px-2 py-1"
                  >
                    <Plus size={14} />
                  </Button>
                )}
              </div>
            </div>

            {/* Tags List */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : filteredTags.length > 0 ? (
                <div className="p-2">
                  {filteredTags.map((tag) => (
                    <TagOption
                      key={tag.id}
                      tag={tag}
                      onSelect={() => handleTagSelect(tag)}
                      disabled={maxTags ? selectedTags.length >= maxTags : false}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-white/60">
                  <TagIcon size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? 'No tags found' : 'No available tags'}
                  </p>
                  {searchQuery && showCreateButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreateForm(true)}
                      className="mt-2"
                    >
                      Create "{searchQuery}"
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <QuickCreateTagForm
            initialName={searchQuery}
            onSubmit={handleCreateTag}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface TagChipProps {
  tag: Tag;
  onRemove: () => void;
  disabled?: boolean;
}

const TagChip = ({ tag, onRemove, disabled }: TagChipProps) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
      "bg-white/10 border-white/20 text-white",
      !disabled && "hover:bg-white/20 cursor-pointer"
    )}
    style={{ borderColor: tag.color + '40', backgroundColor: tag.color + '20' }}
  >
    <div 
      className="w-2 h-2 rounded-full flex-shrink-0" 
      style={{ backgroundColor: tag.color }}
    />
    <span className="truncate max-w-24">{tag.name}</span>
    {!disabled && (
      <button
        onClick={onRemove}
        className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
      >
        <X size={10} />
      </button>
    )}
  </motion.div>
);

interface TagOptionProps {
  tag: Tag;
  onSelect: () => void;
  disabled?: boolean;
}

const TagOption = ({ tag, onSelect, disabled }: TagOptionProps) => (
  <motion.button
    whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
    onClick={onSelect}
    disabled={disabled}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
      disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10"
    )}
  >
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
    <div className="text-xs text-white/50 px-2 py-1 bg-white/10 rounded-full">
      {getCategoryDisplayName(tag.category)}
    </div>
  </motion.button>
);

interface QuickCreateTagFormProps {
  initialName: string;
  onSubmit: (name: string, category: TagCategory) => void;
  onCancel: () => void;
}

const QuickCreateTagForm = ({ initialName, onSubmit, onCancel }: QuickCreateTagFormProps) => {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<TagCategory>('custom');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), category);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 right-0 mt-2 glass-dark border border-white/10 rounded-lg shadow-xl z-50 p-4"
    >
      <h4 className="font-medium text-white mb-3">Create New Tag</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tag name..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TagCategory)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {['custom', 'visa_info', 'hotel_info', 'restaurant_type', 'supplier_type', 'document_type', 'destination', 'activity_type', 'transportation'].map(cat => (
            <option key={cat} value={cat}>
              {getCategoryDisplayName(cat as TagCategory)}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="primary" size="sm" className="flex-1">
            Create
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
};