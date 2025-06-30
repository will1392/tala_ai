import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../shared/Button';

interface DeleteDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteDocument: () => Promise<void>;
  documentTitle: string;
}

export const DeleteDocumentModal = ({ 
  isOpen, 
  onClose, 
  onDeleteDocument,
  documentTitle
}: DeleteDocumentModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteDocument();
      onClose();
    } catch (error) {
      console.error('Failed to delete document:', error);
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
              <h2 className="text-xl font-semibold">Delete Document</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X size={20} />
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-white/80">
              Are you sure you want to delete <strong className="text-white">"{documentTitle}"</strong>?
            </p>
            
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                ⚠️ This action cannot be undone. The document and all its content will be permanently removed.
              </p>
            </div>

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
                {isDeleting ? 'Deleting...' : 'Delete Document'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};