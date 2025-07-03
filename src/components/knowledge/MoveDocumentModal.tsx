import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderOpen, Folder } from 'lucide-react';
import { Button } from '../shared/Button';
import { type Folder as FolderType } from '../../services/folderService';
import type { PrimaryFolder } from '../../types/primaryFolder';

interface MoveDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMoveDocument: (folderId: string | null, primaryFolderId?: string) => Promise<void>;
  documentTitle: string;
  currentFolderId?: string;
  currentPrimaryFolderId?: string;
  folders: FolderType[];
  primaryFolders: PrimaryFolder[];
}

export const MoveDocumentModal = ({ 
  isOpen, 
  onClose, 
  onMoveDocument,
  documentTitle,
  currentFolderId,
  currentPrimaryFolderId,
  folders,
  primaryFolders
}: MoveDocumentModalProps) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId || null);
  const [selectedPrimaryFolderId, setSelectedPrimaryFolderId] = useState<string | null>(currentPrimaryFolderId || null);
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = async () => {
    if (selectedFolderId === currentFolderId && selectedPrimaryFolderId === currentPrimaryFolderId) {
      onClose();
      return;
    }

    setIsMoving(true);
    try {
      await onMoveDocument(selectedFolderId, selectedPrimaryFolderId || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to move document:', error);
    } finally {
      setIsMoving(false);
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
                <FolderOpen size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Move Document</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X size={20} />
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-white/80">
              Move <strong className="text-white">"{documentTitle}"</strong> to:
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {/* Primary Folders Section */}
              <div>
                <h4 className="text-sm font-medium text-white/80 mb-2">Primary Categories</h4>
                <div className="space-y-2">
                  {primaryFolders.map((primaryFolder) => (
                    <button
                      key={`primary-${primaryFolder.id}`}
                      onClick={() => {
                        setSelectedPrimaryFolderId(primaryFolder.id);
                        setSelectedFolderId(null); // Clear sub-folder selection when selecting primary folder
                      }}
                      disabled={primaryFolder.id === currentPrimaryFolderId && !currentFolderId}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedPrimaryFolderId === primaryFolder.id && selectedFolderId === null
                          ? 'bg-primary/20 border-primary border'
                          : primaryFolder.id === currentPrimaryFolderId && !currentFolderId
                          ? 'bg-gray-500/20 border-gray-500/50 border cursor-not-allowed opacity-50'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <div 
                        className="w-5 h-5 rounded flex items-center justify-center text-sm"
                        style={{ backgroundColor: `${primaryFolder.color}40`, color: primaryFolder.color }}
                      >
                        📁
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{primaryFolder.name}</p>
                        <p className="text-xs text-white/60">
                          {primaryFolder.id === currentPrimaryFolderId && !currentFolderId 
                            ? 'Current location' 
                            : `${primaryFolder.subFolderCount} sub-folders`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Folders Section */}
              {folders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white/80 mb-2">Sub-folders</h4>
                  <div className="space-y-2">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setSelectedFolderId(folder.id);
                          setSelectedPrimaryFolderId(folder.primaryFolderId || null); // Set primary folder if sub-folder belongs to one
                        }}
                        disabled={folder.id === currentFolderId}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          selectedFolderId === folder.id
                            ? 'bg-primary/20 border-primary border'
                            : folder.id === currentFolderId
                            ? 'bg-gray-500/20 border-gray-500/50 border cursor-not-allowed opacity-50'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        <Folder size={18} className="text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{folder.name}</p>
                          <p className="text-xs text-white/60">
                            {folder.id === currentFolderId ? 'Current location' : `${folder.documentCount} documents`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1"
                disabled={isMoving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleMove}
                className="flex-1"
                disabled={isMoving || selectedFolderId === currentFolderId}
              >
                {isMoving ? 'Moving...' : 'Move Document'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};