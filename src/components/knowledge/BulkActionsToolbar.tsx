import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, FolderInput, X, Check, AlertTriangle } from 'lucide-react';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkMove: () => void;
  onExitSelectionMode: () => void;
}

export const BulkActionsToolbar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkMove,
  onExitSelectionMode
}: BulkActionsToolbarProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="glass-dark rounded-xl p-4 border border-primary/20 bg-primary/5"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Selection Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={allSelected ? onClearSelection : onSelectAll}
                className={cn(
                  "w-6 h-6 rounded border-2 flex items-center justify-center transition-all",
                  allSelected 
                    ? "bg-primary border-primary text-white" 
                    : selectedCount > 0
                    ? "bg-primary/50 border-primary text-white"
                    : "border-white/30 hover:border-primary"
                )}
              >
                {allSelected && <Check size={14} />}
                {selectedCount > 0 && selectedCount < totalCount && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </button>
              <span className="text-white font-medium">
                {selectedCount === 0 
                  ? 'Select documents'
                  : `${selectedCount} of ${totalCount} selected`
                }
              </span>
            </div>

            {selectedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-white/60"
              >
                Use Shift+Click to select range
              </motion.div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                {/* Move Action */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBulkMove}
                  className="px-3 py-2 text-white/80 hover:text-white hover:bg-white/10"
                >
                  <FolderInput size={16} className="mr-1" />
                  Move
                </Button>

                {/* Delete Action */}
                {!showDeleteConfirm ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Delete
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2"
                  >
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-red-200 text-sm">
                      Delete {selectedCount} document{selectedCount > 1 ? 's' : ''}?
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBulkDelete}
                        className="px-2 py-1 text-red-200 hover:text-white hover:bg-red-500/20 text-xs"
                      >
                        Yes
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-1 text-white/60 hover:text-white hover:bg-white/10 text-xs"
                      >
                        No
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Clear Selection */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="px-3 py-2 text-white/60 hover:text-white hover:bg-white/10"
                >
                  Clear
                </Button>
              </motion.div>
            )}

            {/* Exit Selection Mode */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onExitSelectionMode}
              className="px-3 py-2 text-white/60 hover:text-white hover:bg-white/10"
            >
              <X size={16} className="mr-1" />
              Done
            </Button>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        {selectedCount === 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-white/10"
          >
            <div className="text-xs text-white/50 flex items-center gap-4">
              <span>💡 Tips:</span>
              <span>Click documents to select • Shift+Click for range • Ctrl/Cmd+A for all</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};