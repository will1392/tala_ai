import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderEdit } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditFolder: (name: string, description?: string) => Promise<void>;
  currentName: string;
  currentDescription?: string;
}

export const EditFolderModal = ({ 
  isOpen, 
  onClose, 
  onEditFolder,
  currentName,
  currentDescription 
}: EditFolderModalProps) => {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onEditFolder(name.trim(), description.trim() || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to edit folder:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="glass-dark rounded-2xl p-6 max-w-md w-full border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <FolderEdit size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Edit Folder</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X size={20} />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Folder Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Japan Travel Docs"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description <span className="text-white/50">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this folder's contents..."
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:border-primary focus:outline-none resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={!name.trim() || isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Folder'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};