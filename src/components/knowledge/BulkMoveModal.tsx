import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, FolderInput, CheckCircle } from 'lucide-react';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';

interface Folder {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
}

interface BulkMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  selectedDocuments: Array<{ id: string; title: string; folderId?: string }>;
  onMove: (folderId: string | null) => void;
}

export const BulkMoveModal = ({ 
  isOpen, 
  onClose, 
  folders, 
  selectedDocuments,
  onMove 
}: BulkMoveModalProps) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Get current folders of selected documents
  const currentFolders = [...new Set(selectedDocuments.map(doc => doc.folderId).filter(Boolean))];
  const isFromSingleFolder = currentFolders.length <= 1;
  
  const handleMove = async () => {
    setIsMoving(true);
    try {
      await onMove(selectedFolderId);
      onClose();
    } catch (error) {
      console.error('Failed to move documents:', error);
    } finally {
      setIsMoving(false);
    }
  };

  const handleClose = () => {
    if (!isMoving) {
      setSelectedFolderId(null);
      onClose();
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
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <FolderInput className="text-primary" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Move Documents</h2>
                <p className="text-sm text-gray-600">
                  Move {selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''} to a folder
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 text-gray-600 hover:text-gray-900"
              onClick={handleClose}
              disabled={isMoving}
            >
              <X size={18} />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Current location info */}
            {isFromSingleFolder && currentFolders[0] && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Folder size={14} />
                  <span>
                    Currently in: <strong>
                      {folders.find(f => f.id === currentFolders[0])?.name || 'Unknown Folder'}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Selected documents preview */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Documents:</h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedDocuments.map(doc => (
                  <div key={doc.id} className="text-sm text-gray-600 flex items-center gap-2">
                    <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Destination selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Choose destination:</h3>
              
              {/* Root folder option */}
              <button
                onClick={() => setSelectedFolderId(null)}
                className={cn(
                  "w-full p-3 rounded-lg border text-left transition-all mb-2",
                  selectedFolderId === null
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Folder size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">Root Folder</div>
                    <div className="text-xs text-gray-500">Move to the main documents area</div>
                  </div>
                </div>
              </button>

              {/* Folder options */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    disabled={currentFolders.includes(folder.id)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      selectedFolderId === folder.id
                        ? "border-primary bg-primary/10 text-primary"
                        : currentFolders.includes(folder.id)
                        ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Folder size={16} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{folder.name}</div>
                        <div className="text-xs text-gray-500">
                          {currentFolders.includes(folder.id) ? 'Current location' : 'Destination folder'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <Button 
              variant="ghost" 
              onClick={handleClose}
              disabled={isMoving}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleMove}
              disabled={isMoving}
              className="min-w-[100px]"
            >
              {isMoving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Moving...
                </div>
              ) : (
                `Move ${selectedDocuments.length} Document${selectedDocuments.length > 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};