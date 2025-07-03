import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface GlobalDragDropOverlayProps {
  onFilesDropped: (files: File[]) => void;
  isEnabled?: boolean;
  acceptedFileTypes?: string[];
}

export const GlobalDragDropOverlay = ({ 
  onFilesDropped, 
  isEnabled = true,
  acceptedFileTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt']
}: GlobalDragDropOverlayProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [_dragCounter, setDragCounter] = useState(0);
  const [hasValidFiles, setHasValidFiles] = useState(true);

  const isValidFile = useCallback((file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension && acceptedFileTypes.includes(extension);
  }, [acceptedFileTypes]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isEnabled) return;
    
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer?.items) {
      const files = Array.from(e.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter(Boolean) as File[];
      
      const validFiles = files.some(file => isValidFile(file));
      setHasValidFiles(validFiles);
      setIsDragOver(true);
    }
  }, [isEnabled, isValidFile]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter <= 0) {
        setIsDragOver(false);
        setHasValidFiles(true);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isEnabled) return;
    
    // Change cursor based on file validity
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = hasValidFiles ? 'copy' : 'none';
    }
  }, [isEnabled, hasValidFiles]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setDragCounter(0);
    setHasValidFiles(true);
    
    if (!isEnabled || !e.dataTransfer?.files) return;
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(isValidFile);
    
    if (validFiles.length > 0) {
      onFilesDropped(validFiles);
    }
  }, [isEnabled, isValidFile, onFilesDropped]);

  useEffect(() => {
    if (!isEnabled) return;

    // Add event listeners to the document
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [isEnabled, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <AnimatePresence>
      {isDragOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] pointer-events-none"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          
          {/* Content */}
          <div className="relative h-full flex items-center justify-center p-8">
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={cn(
                "glass-dark rounded-2xl p-12 text-center max-w-md w-full",
                "border-4 border-dashed transition-all",
                hasValidFiles 
                  ? "border-primary bg-primary/10" 
                  : "border-red-400 bg-red-400/10"
              )}
            >
              {hasValidFiles ? (
                <>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="mb-6"
                  >
                    <Upload size={64} className="mx-auto text-primary" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Drop Files Here
                  </h3>
                  <p className="text-white/70 mb-4">
                    Release to upload your documents to the knowledge base
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-white/50">
                    <FileText size={16} />
                    <span>Supports: {acceptedFileTypes.join(', ').toUpperCase()}</span>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ 
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="mb-6"
                  >
                    <AlertTriangle size={64} className="mx-auto text-red-400" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-red-200 mb-2">
                    Invalid File Types
                  </h3>
                  <p className="text-red-200/70 mb-4">
                    Only document files are accepted
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-red-200/50">
                    <FileText size={16} />
                    <span>Supported: {acceptedFileTypes.join(', ').toUpperCase()}</span>
                  </div>
                </>
              )}
            </motion.div>
          </div>
          
          {/* Corner indicators */}
          <div className="absolute top-4 left-4">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={cn(
                "w-8 h-8 rounded-full",
                hasValidFiles ? "bg-primary" : "bg-red-400"
              )}
            />
          </div>
          <div className="absolute top-4 right-4">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              className={cn(
                "w-8 h-8 rounded-full",
                hasValidFiles ? "bg-primary" : "bg-red-400"
              )}
            />
          </div>
          <div className="absolute bottom-4 left-4">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
              className={cn(
                "w-8 h-8 rounded-full",
                hasValidFiles ? "bg-primary" : "bg-red-400"
              )}
            />
          </div>
          <div className="absolute bottom-4 right-4">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.9 }}
              className={cn(
                "w-8 h-8 rounded-full",
                hasValidFiles ? "bg-primary" : "bg-red-400"
              )}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};