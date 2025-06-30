import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../shared/Button';

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteFolder: () => Promise<void>;
  folderName: string;
  documentCount: number;
}

export const DeleteFolderModal = ({ 
  isOpen, 
  onClose, 
  onDeleteFolder,
  folderName,
  documentCount
}: DeleteFolderModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteFolder();
      onClose();
    } catch (error) {
      console.error('Failed to delete folder:', error);
    } finally {
      setIsDeleting(false);
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
          className="glass-dark rounded-2xl p-6 max-w-md w-full border border-red-500/20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <h2 className="text-xl font-semibold">Delete Folder</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X size={20} />
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-white/80">
              Are you sure you want to delete the folder <strong className="text-white">"{folderName}"</strong>?
            </p>
            
            {documentCount > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-400">
                  ⚠️ This folder contains {documentCount} document{documentCount !== 1 ? 's' : ''}. 
                  The documents will not be deleted but will be moved to "All Documents".
                </p>
              </div>
            )}

            <p className="text-sm text-white/60">
              This action cannot be undone.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleDelete}
                className="flex-1 bg-red-500 hover:bg-red-600"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Folder'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};