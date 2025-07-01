import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Loader2, CheckCircle, AlertCircle, X, Pause, Play } from 'lucide-react';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';

interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
}

interface FloatingUploadProgressProps {
  uploads: UploadProgress[];
  onPauseResume?: () => void;
  onCancel?: () => void;
  onDismiss?: (id: string) => void;
  isPaused?: boolean;
  isVisible?: boolean;
}

export const FloatingUploadProgress = ({
  uploads,
  onPauseResume,
  onCancel,
  onDismiss,
  isPaused = false,
  isVisible = true
}: FloatingUploadProgressProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible || uploads.length === 0) return null;

  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'paused');
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const errorUploads = uploads.filter(u => u.status === 'error');
  
  const totalProgress = uploads.length > 0 
    ? uploads.reduce((acc, upload) => acc + upload.progress, 0) / uploads.length
    : 0;

  const hasActiveUploads = activeUploads.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-40 w-80"
      >
        <div className="glass-dark rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Header */}
          <div 
            className="p-4 cursor-pointer select-none"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {hasActiveUploads ? (
                  isPaused ? (
                    <Pause size={16} className="text-yellow-400" />
                  ) : (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  )
                ) : (
                  <CheckCircle size={16} className="text-green-400" />
                )}
                <span className="font-medium text-sm">
                  {hasActiveUploads 
                    ? isPaused 
                      ? 'Upload Paused' 
                      : 'Uploading...'
                    : 'Upload Complete'
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                {hasActiveUploads && onPauseResume && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPauseResume();
                    }}
                    className="p-1 text-xs"
                  >
                    {isPaused ? <Play size={12} /> : <Pause size={12} />}
                  </Button>
                )}
                
                {hasActiveUploads && onCancel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel();
                    }}
                    className="p-1 text-xs text-red-400"
                  >
                    <X size={12} />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </Button>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>
                  {completedUploads.length}/{uploads.length} files completed
                </span>
                <span>{Math.round(totalProgress)}%</span>
              </div>
              
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div 
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    hasActiveUploads 
                      ? isPaused 
                        ? "bg-yellow-400" 
                        : "bg-primary"
                      : errorUploads.length > 0
                      ? "bg-red-400"
                      : "bg-green-400"
                  )}
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
              
              {errorUploads.length > 0 && (
                <div className="text-xs text-red-400">
                  {errorUploads.length} failed
                </div>
              )}
            </div>
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/10"
              >
                <div className="p-4 max-h-60 overflow-y-auto space-y-2">
                  {uploads.map((upload) => (
                    <motion.div
                      key={upload.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        "p-2 rounded-lg border",
                        upload.status === 'completed' && "bg-green-400/10 border-green-400/20",
                        upload.status === 'error' && "bg-red-400/10 border-red-400/20",
                        upload.status === 'uploading' && "bg-primary/10 border-primary/20",
                        upload.status === 'paused' && "bg-yellow-400/10 border-yellow-400/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate pr-2">
                          {upload.fileName}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {upload.status === 'uploading' && (
                            <Loader2 size={10} className="animate-spin text-primary" />
                          )}
                          {upload.status === 'completed' && (
                            <CheckCircle size={10} className="text-green-400" />
                          )}
                          {upload.status === 'error' && (
                            <AlertCircle size={10} className="text-red-400" />
                          )}
                          {upload.status === 'paused' && (
                            <Pause size={10} className="text-yellow-400" />
                          )}
                          
                          {(upload.status === 'completed' || upload.status === 'error') && onDismiss && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDismiss(upload.id)}
                              className="p-0.5 text-white/40 hover:text-white/60"
                            >
                              <X size={8} />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {upload.status === 'uploading' || upload.status === 'paused' ? (
                        <div className="space-y-1">
                          <div className="w-full bg-white/10 rounded-full h-1">
                            <div 
                              className={cn(
                                "h-1 rounded-full transition-all duration-300",
                                upload.status === 'paused' ? "bg-yellow-400" : "bg-primary"
                              )}
                              style={{ width: `${upload.progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-white/60">
                            {upload.status === 'paused' ? 'Paused' : `${upload.progress}%`}
                          </div>
                        </div>
                      ) : upload.status === 'error' && upload.error ? (
                        <div className="text-xs text-red-400 mt-1">
                          {upload.error}
                        </div>
                      ) : upload.status === 'completed' ? (
                        <div className="text-xs text-green-400 mt-1">
                          Upload completed successfully
                        </div>
                      ) : null}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};