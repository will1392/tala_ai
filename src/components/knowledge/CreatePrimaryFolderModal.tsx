import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, Eye, EyeOff, Plus, AlertCircle } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { primaryFolderService } from '../../services/primaryFolderService';
import type { CreatePrimaryFolderRequest } from '../../types/primaryFolder';
import toast from 'react-hot-toast';

interface CreatePrimaryFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePrimaryFolder: () => void;
}

export const CreatePrimaryFolderModal = ({ 
  isOpen, 
  onClose, 
  onCreatePrimaryFolder 
}: CreatePrimaryFolderModalProps) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [color, setColor] = useState('#6b7280');
  const [visibility, setVisibility] = useState<'public' | 'admin-only'>('public');
  const [canCreate, setCanCreate] = useState(true);
  const [canUpload, setCanUpload] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Auto-generate slug from name
  useEffect(() => {
    if (name) {
      const autoSlug = primaryFolderService.generateSlug(name);
      setSlug(autoSlug);
      
      // Validate slug
      const validation = primaryFolderService.validateSlug(autoSlug);
      setSlugError(validation.isValid ? null : validation.error || null);
    }
  }, [name]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setSlug('');
      setDescription('');
      setIcon('Folder');
      setColor('#6b7280');
      setVisibility('public');
      setCanCreate(true);
      setCanUpload(true);
      setCanEdit(false);
      setError(null);
      setSlugError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (slugError) {
      setError('Please fix the slug error before continuing');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const request: CreatePrimaryFolderRequest = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        permissions: {
          visibility,
          canCreate,
          canUpload,
          canEdit
        },
        userId: 'admin-1'
      };

      await primaryFolderService.createPrimaryFolder(request);
      toast.success(`Created "${name}" category successfully!`);
      onCreatePrimaryFolder();
      onClose();
    } catch (err) {
      console.error('Failed to create primary folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create category');
      toast.error('Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  const availableColors = primaryFolderService.getAvailableColors();
  const availableIcons = primaryFolderService.getAvailableIcons();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-hidden"
          >
            <GlassCard className="p-0">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Plus size={18} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Create New Category</h2>
                    <p className="text-sm text-white/60">Add a new primary folder category</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
                  <X size={18} />
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Error Display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-dark rounded-lg p-3 border border-red-500/20 bg-red-500/5"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-400" />
                      <span className="text-sm text-red-400">{error}</span>
                    </div>
                  </motion.div>
                )}

                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white/80">Basic Information</h3>
                  
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Travel Insurance"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                               focus:border-primary focus:ring-1 focus:ring-primary/20 
                               text-white placeholder-white/40 transition-all"
                      required
                      disabled={isCreating}
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="travel-insurance"
                      className={`w-full px-3 py-2 rounded-lg bg-white/5 border transition-all
                               text-white placeholder-white/40 text-sm font-mono
                               ${slugError 
                                 ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' 
                                 : 'border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/20'
                               }`}
                      required
                      disabled={isCreating}
                    />
                    {slugError && (
                      <p className="text-xs text-red-400 mt-1">{slugError}</p>
                    )}
                    <p className="text-xs text-white/50 mt-1">
                      Used in URLs. Only lowercase letters, numbers, and hyphens.
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of what documents belong in this category..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                               focus:border-primary focus:ring-1 focus:ring-primary/20 
                               text-white placeholder-white/40 transition-all resize-none"
                      disabled={isCreating}
                    />
                  </div>
                </div>

                {/* Appearance */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white/80">Appearance</h3>
                  
                  {/* Icon Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Icon
                    </label>
                    <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                      {availableIcons.map((iconOption) => (
                        <button
                          key={iconOption.value}
                          type="button"
                          onClick={() => setIcon(iconOption.value)}
                          className={`p-2 rounded-lg border transition-all ${
                            icon === iconOption.value
                              ? 'border-primary bg-primary/20'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                          disabled={isCreating}
                          title={iconOption.name}
                        >
                          <Folder size={16} className="text-white" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Theme Color
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {availableColors.map((colorOption) => (
                        <button
                          key={colorOption.value}
                          type="button"
                          onClick={() => setColor(colorOption.value)}
                          className={`h-10 rounded-lg border transition-all ${
                            color === colorOption.value
                              ? 'border-white border-2 scale-110'
                              : 'border-white/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: colorOption.value }}
                          disabled={isCreating}
                          title={colorOption.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white/80">Permissions</h3>
                  
                  {/* Visibility */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Visibility
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibility('public')}
                        className={`p-3 rounded-lg border transition-all ${
                          visibility === 'public'
                            ? 'border-primary bg-primary/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                        disabled={isCreating}
                      >
                        <div className="flex items-center gap-2">
                          <Eye size={16} />
                          <span className="text-sm">Public</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibility('admin-only')}
                        className={`p-3 rounded-lg border transition-all ${
                          visibility === 'admin-only'
                            ? 'border-primary bg-primary/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                        disabled={isCreating}
                      >
                        <div className="flex items-center gap-2">
                          <EyeOff size={16} />
                          <span className="text-sm">Admin Only</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      User Capabilities
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={canUpload}
                          onChange={(e) => setCanUpload(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary/20"
                          disabled={isCreating}
                        />
                        <span className="text-sm">Can upload documents</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={canCreate}
                          onChange={(e) => setCanCreate(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary/20"
                          disabled={isCreating}
                        />
                        <span className="text-sm">Can create sub-folders</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={canEdit}
                          onChange={(e) => setCanEdit(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary/20"
                          disabled={isCreating}
                        />
                        <span className="text-sm">Can edit this category (admin only)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isCreating || !name.trim() || !!slugError}
                    className="flex-1"
                  >
                    {isCreating ? 'Creating...' : 'Create Category'}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};