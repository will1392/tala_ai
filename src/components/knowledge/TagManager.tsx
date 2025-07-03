/**
 * Tag Manager Component
 * Central management interface for the tag library
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Tag as TagIcon, 
  Download,
  Upload,
  Users
} from 'lucide-react';
import { Button } from '../shared/Button';
import { tagService } from '../../services/tagService';
import type { Tag, TagCategory, CreateTagRequest, UpdateTagRequest } from '../../types/tags';
import { getCategoryDisplayName, TAG_TEMPLATES } from '../../types/tags';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTagUpdate?: () => void;
}

export const TagManager = ({ isOpen, onClose, onTagUpdate }: TagManagerProps) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TagCategory | 'all'>('all');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tagStats, setTagStats] = useState<Array<{ tag: Tag; usage_count: number }>>([]);

  // Load tags on component mount
  useEffect(() => {
    if (isOpen) {
      loadTags();
      loadTagStats();
    }
  }, [isOpen]);

  // Filter tags based on search and category
  useEffect(() => {
    let filtered = tags;

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
  }, [tags, searchQuery, selectedCategory]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const allTags = await tagService.getAllTags();
      setTags(allTags);
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

  const handleCreateTag = async (request: CreateTagRequest | UpdateTagRequest) => {
    try {
      await tagService.createTag(request as CreateTagRequest);
      await loadTags();
      await loadTagStats();
      setShowCreateForm(false);
      onTagUpdate?.();
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleUpdateTag = async (request: CreateTagRequest | UpdateTagRequest) => {
    try {
      await tagService.updateTag(request as UpdateTagRequest);
      await loadTags();
      await loadTagStats();
      setEditingTag(null);
      onTagUpdate?.();
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) {
      return;
    }

    try {
      await tagService.deleteTag(tagId);
      await loadTags();
      await loadTagStats();
      onTagUpdate?.();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const initializeDefaultTags = async () => {
    if (!confirm('This will create default tags for all categories. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      await tagService.initializeDefaultTags();
      await loadTags();
      await loadTagStats();
      onTagUpdate?.();
    } catch (error) {
      console.error('Failed to initialize default tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportTags = async () => {
    try {
      const data = await tagService.exportTags();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tags-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export tags:', error);
    }
  };

  const getUsageCount = (tagId: string): number => {
    const stat = tagStats.find(s => s.tag.id === tagId);
    return stat?.usage_count || 0;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-6xl max-h-[90vh] glass-dark rounded-2xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <TagIcon className="text-primary" size={24} />
            <div>
              <h2 className="text-xl font-bold">Tag Library Manager</h2>
              <p className="text-white/60 text-sm">Manage tags for enhanced searchability and organization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={exportTags}>
              <Download size={16} />
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={initializeDefaultTags}>
              <Upload size={16} />
              Initialize Defaults
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags..."
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TagCategory | 'all')}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              {Object.keys(TAG_TEMPLATES).map(category => (
                <option key={category} value={category}>
                  {getCategoryDisplayName(category as TagCategory)}
                </option>
              ))}
            </select>

            {/* Create Tag Button */}
            <Button
              variant="primary"
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Create Tag
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-white/60">
            <span>Total Tags: {tags.length}</span>
            <span>Filtered: {filteredTags.length}</span>
            <span>Categories: {new Set(tags.map(t => t.category)).size}</span>
          </div>
        </div>

        {/* Tag List */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : filteredTags.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTags.map((tag) => (
                <TagCard
                  key={tag.id}
                  tag={tag}
                  usageCount={getUsageCount(tag.id)}
                  onEdit={() => setEditingTag(tag)}
                  onDelete={() => handleDeleteTag(tag.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TagIcon size={48} className="mx-auto mb-4 text-white/30" />
              <h3 className="text-lg font-medium mb-2">No Tags Found</h3>
              <p className="text-white/60 mb-4">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first tag to get started'
                }
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <Button variant="primary" onClick={() => setShowCreateForm(true)}>
                  Create First Tag
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Create/Edit Forms */}
        <AnimatePresence>
          {showCreateForm && (
            <TagForm
              mode="create"
              onSubmit={handleCreateTag}
              onCancel={() => setShowCreateForm(false)}
            />
          )}
          {editingTag && (
            <TagForm
              mode="edit"
              tag={editingTag}
              onSubmit={handleUpdateTag}
              onCancel={() => setEditingTag(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

interface TagCardProps {
  tag: Tag;
  usageCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

const TagCard = ({ tag, usageCount, onEdit, onDelete }: TagCardProps) => (
  <motion.div
    layout
    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: tag.color }}
        />
        <span className="font-medium text-white">{tag.name}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded text-white/60 hover:text-red-400 hover:bg-red-400/10"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>

    {tag.description && (
      <p className="text-sm text-white/60 mb-3 line-clamp-2">{tag.description}</p>
    )}

    <div className="flex items-center justify-between text-xs text-white/50">
      <span className="px-2 py-1 bg-white/10 rounded-full">
        {getCategoryDisplayName(tag.category)}
      </span>
      <div className="flex items-center gap-1">
        <Users size={12} />
        <span>{usageCount}</span>
      </div>
    </div>
  </motion.div>
);

interface TagFormProps {
  mode: 'create' | 'edit';
  tag?: Tag;
  onSubmit: (request: CreateTagRequest | UpdateTagRequest) => void;
  onCancel: () => void;
}

const TagForm = ({ mode, tag, onSubmit, onCancel }: TagFormProps) => {
  const [formData, setFormData] = useState({
    name: tag?.name || '',
    description: tag?.description || '',
    color: tag?.color || '#6b7280',
    category: tag?.category || 'custom' as TagCategory
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      onSubmit(formData);
    } else {
      onSubmit({ id: tag!.id, ...formData });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-dark rounded-xl border border-white/10 p-6"
      >
        <h3 className="text-lg font-bold mb-4">
          {mode === 'create' ? 'Create New Tag' : 'Edit Tag'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Tag name..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as TagCategory })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.keys(TAG_TEMPLATES).map(category => (
                <option key={category} value={category}>
                  {getCategoryDisplayName(category as TagCategory)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-12 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="#6b7280"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button type="submit" variant="primary" className="flex-1">
            {mode === 'create' ? 'Create Tag' : 'Update Tag'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
};