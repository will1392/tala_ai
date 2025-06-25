import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { useSearchService } from '../../hooks/useSearchService';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

interface UploadZoneProps {
  onClose: () => void;
}

interface FileUploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  result?: { documentId: string; chunksStored: number };
  error?: string;
}

export const UploadZone = ({ onClose }: UploadZoneProps) => {
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { uploadDocument, isInitialized } = useSearchService();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newStatuses = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const
    }));
    setFileStatuses(prev => [...prev, ...newStatuses]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    disabled: !isInitialized || isUploading
  });

  const removeFile = useCallback((index: number) => {
    setFileStatuses(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = async () => {
    if (!isInitialized || fileStatuses.length === 0) return;

    setIsUploading(true);
    
    try {
      // Upload files one by one
      for (let i = 0; i < fileStatuses.length; i++) {
        const fileStatus = fileStatuses[i];
        
        if (fileStatus.status !== 'pending') continue;

        // Update status to uploading
        setFileStatuses(prev => 
          prev.map((status, index) => 
            index === i ? { ...status, status: 'uploading' } : status
          )
        );

        try {
          const result = await uploadDocument(fileStatus.file);
          
          // Update status to success
          setFileStatuses(prev => 
            prev.map((status, index) => 
              index === i ? { ...status, status: 'success', result } : status
            )
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          
          // Update status to error
          setFileStatuses(prev => 
            prev.map((status, index) => 
              index === i ? { ...status, status: 'error', error: errorMessage } : status
            )
          );
        }
      }

      // Check if all uploads completed successfully
      const hasErrors = fileStatuses.some(status => status.status === 'error');
      const successCount = fileStatuses.filter(status => status.status === 'success').length;
      
      if (!hasErrors) {
        toast.success(`🎉 All ${successCount} documents uploaded successfully!`);
        setTimeout(onClose, 2000); // Auto-close after success
      } else {
        toast.error('Some uploads failed. Please check the file list.');
      }
    } catch (error) {
      toast.error('Upload process failed');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl"
        >
          <GlassCard className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Upload Documents</h2>
              <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
                <X size={20} />
              </Button>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                'glass rounded-xl p-12 text-center cursor-pointer transition-all',
                'border-2 border-dashed',
                isDragActive ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-white/40'
              )}
            >
              <input {...getInputProps()} />
              <Upload size={48} className="mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium mb-2">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-white/60">
                or click to browse from your computer
              </p>
              <p className="text-xs text-white/40 mt-4">
                Supports PDF, Word, Excel, and PowerPoint files
              </p>
            </div>

            {/* File List */}
            {fileStatuses.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-medium mb-2">Files ({fileStatuses.length})</h3>
                {fileStatuses.map((fileStatus, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <FileText size={20} className="text-primary" />
                        {fileStatus.status === 'uploading' && (
                          <Loader2 size={12} className="absolute -top-1 -right-1 animate-spin text-primary" />
                        )}
                        {fileStatus.status === 'success' && (
                          <CheckCircle size={12} className="absolute -top-1 -right-1 text-green-400" />
                        )}
                        {fileStatus.status === 'error' && (
                          <AlertCircle size={12} className="absolute -top-1 -right-1 text-red-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium">{fileStatus.file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <span>{(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB</span>
                          
                          {fileStatus.status === 'uploading' && (
                            <span className="text-primary">Processing...</span>
                          )}
                          {fileStatus.status === 'success' && fileStatus.result && (
                            <span className="text-green-400">
                              ✓ {fileStatus.result.chunksStored} chunks processed
                            </span>
                          )}
                          {fileStatus.status === 'error' && (
                            <span className="text-red-400">✗ {fileStatus.error}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {fileStatus.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="p-1"
                        disabled={isUploading}
                      >
                        <X size={16} />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-4 p-3 glass rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span className="text-sm font-medium">Processing documents...</span>
                </div>
                <div className="text-xs text-white/60">
                  This may take a few moments depending on document size and complexity.
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={onClose}
                disabled={isUploading}
              >
                {isUploading ? 'Processing...' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={fileStatuses.length === 0 || !isInitialized || isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload {fileStatuses.length} {fileStatuses.length === 1 ? 'File' : 'Files'}
                  </>
                )}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};