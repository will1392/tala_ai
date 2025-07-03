import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, Shield, FileText, Folder } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { primaryFolderService } from '../../services/primaryFolderService';
import type { PrimaryFolder } from '../../types/primaryFolder';
import toast from 'react-hot-toast';

interface DeletePrimaryFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeletePrimaryFolder: () => void;
  primaryFolder: PrimaryFolder;
}

export const DeletePrimaryFolderModal = ({ 
  isOpen, 
  onClose, 
  onDeletePrimaryFolder,
  primaryFolder 
}: DeletePrimaryFolderModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (primaryFolder.isSystem) {
      setError('Cannot delete system folders');
      return;
    }

    if (confirmationText !== primaryFolder.name) {
      setError('Please type the folder name exactly to confirm deletion');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await primaryFolderService.deletePrimaryFolder(primaryFolder.id, 'admin-1');
      toast.success(`Deleted "${primaryFolder.name}" category successfully!`);
      onDeletePrimaryFolder();
      onClose();
    } catch (err) {
      console.error('Failed to delete primary folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      toast.error('Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = primaryFolder && !primaryFolder.isSystem;
  const hasContent = primaryFolder && (primaryFolder.documentCount > 0 || primaryFolder.subFolderCount > 0);

  return (
    <AnimatePresence>
      {isOpen && primaryFolder && (
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
            className="relative w-full max-w-md"
          >
            <GlassCard className="p-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Trash2 size={18} className="text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Delete Category</h2>
                    <p className="text-sm text-white/60">This action cannot be undone</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
                  <X size={18} />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                {/* System Folder Warning */}
                {primaryFolder.isSystem && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-dark rounded-lg p-4 border border-amber-500/20 bg-amber-500/5"
                  >
                    <div className="flex items-start gap-3">
                      <Shield size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-amber-400 mb-1">System Folder Protected</h3>
                        <p className="text-sm text-white/70">
                          This is a system folder that cannot be deleted. It's essential for the 
                          Knowledge Base organization and is protected from accidental removal.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Content Warning */}
                {canDelete && hasContent && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-dark rounded-lg p-4 border border-red-500/20 bg-red-500/5"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-red-400 mb-2">Warning: Category Contains Data</h3>
                        <div className="space-y-1 text-sm text-white/70">
                          {primaryFolder.documentCount > 0 && (
                            <div className="flex items-center gap-2">
                              <FileText size={14} />
                              <span>{primaryFolder.documentCount} document{primaryFolder.documentCount !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {primaryFolder.subFolderCount > 0 && (
                            <div className="flex items-center gap-2">
                              <Folder size={14} />
                              <span>{primaryFolder.subFolderCount} sub-folder{primaryFolder.subFolderCount !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-white/70 mt-2">
                          All documents and sub-folders in this category will become orphaned and 
                          may be difficult to find.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Folder Info */}
                <div className="glass-dark rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${primaryFolder.color}20`, color: primaryFolder.color }}
                    >
                      <Folder size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium">{primaryFolder.name}</h3>
                      <p className="text-sm text-white/60">{primaryFolder.slug}</p>
                    </div>
                  </div>
                  
                  {primaryFolder.description && (
                    <p className="text-sm text-white/70 mb-3">{primaryFolder.description}</p>
                  )}

                  <div className="flex gap-4 text-sm text-white/60">
                    <span>{primaryFolder.documentCount} documents</span>
                    <span>{primaryFolder.subFolderCount} sub-folders</span>
                    {primaryFolder.isSystem && (
                      <span className="text-amber-400">System</span>
                    )}
                  </div>
                </div>

                {/* Confirmation Input */}
                {canDelete && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Type <span className="font-mono text-red-400">{primaryFolder.name}</span> to confirm deletion
                    </label>
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => {
                        setConfirmationText(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter category name"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                               focus:border-red-500 focus:ring-1 focus:ring-red-500/20 
                               text-white placeholder-white/40 transition-all"
                      disabled={isDeleting}
                    />
                    {error && (
                      <p className="text-xs text-red-400 mt-1">{error}</p>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  
                  {canDelete ? (
                    <Button
                      variant="primary"
                      onClick={handleDelete}
                      disabled={isDeleting || confirmationText !== primaryFolder.name}
                      className="flex-1 bg-red-500 hover:bg-red-600 focus:ring-red-500/20"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Category'}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      disabled
                      className="flex-1 opacity-50 cursor-not-allowed"
                    >
                      Cannot Delete
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};