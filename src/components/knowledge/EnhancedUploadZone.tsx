import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, FileText, CheckCircle, AlertCircle, Loader2, Folder, 
  Pause, Play, RotateCcw, Eye, Trash2, Clock
} from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { useSearchService } from '../../hooks/useSearchService';
import { type Folder as FolderType } from '../../services/folderService';
import { primaryFolderService } from '../../services/primaryFolderService';
import type { PrimaryFolder } from '../../types/primaryFolder';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

interface UploadZoneProps {
  onClose: () => void;
  folders: FolderType[];
  primaryFolderId?: string;
  onUploadComplete?: () => void;
}

interface FileUploadStatus {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'paused' | 'success' | 'error' | 'cancelled';
  progress: number;
  result?: { documentId: string; chunksStored: number };
  error?: string;
  uploadStartTime?: number;
  uploadEndTime?: number;
  retryCount: number;
}

interface UploadStats {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalSize: number;
  uploadedSize: number;
  startTime: number;
  estimatedTimeRemaining?: number;
}

export const EnhancedUploadZone = ({ onClose, folders, primaryFolderId, onUploadComplete }: UploadZoneProps) => {
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [primaryFolders, setPrimaryFolders] = useState<PrimaryFolder[]>([]);
  const [selectedPrimaryFolder, setSelectedPrimaryFolder] = useState<string>(primaryFolderId || '');
  const [loadingPrimaryFolders, setLoadingPrimaryFolders] = useState(false);
  const [maxConcurrentUploads, setMaxConcurrentUploads] = useState(3);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [showUploadDetails, setShowUploadDetails] = useState(false);
  
  const { uploadDocument, isInitialized } = useSearchService();
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Load primary folders on mount
  useEffect(() => {
    const loadPrimaryFolders = async () => {
      setLoadingPrimaryFolders(true);
      try {
        const primaryFoldersData = await primaryFolderService.getPrimaryFolders('admin-1', true);
        setPrimaryFolders(primaryFoldersData);
      } catch (err) {
        console.warn('Failed to load primary folders:', err);
      } finally {
        setLoadingPrimaryFolders(false);
      }
    };

    loadPrimaryFolders();
  }, []);

  // Generate unique ID for files
  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle accepted files
    const newStatuses = acceptedFiles.map(file => ({
      file,
      id: generateFileId(),
      status: 'pending' as const,
      progress: 0,
      retryCount: 0
    }));
    
    setFileStatuses(prev => [...prev, ...newStatuses]);

    // Show rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        const errors = rejection.errors.map((e: any) => e.message).join(', ');
        toast.error(`${rejection.file.name}: ${errors}`);
      });
    }

    // Auto-show details if files added
    if (newStatuses.length > 0) {
      setShowUploadDetails(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    disabled: !isInitialized,
    maxSize: 50 * 1024 * 1024, // 50MB limit
    multiple: true
  });

  // Calculate upload statistics
  const calculateStats = useCallback(() => {
    if (fileStatuses.length === 0) return null;

    const totalFiles = fileStatuses.length;
    const completedFiles = fileStatuses.filter(f => f.status === 'success').length;
    const failedFiles = fileStatuses.filter(f => f.status === 'error').length;
    const totalSize = fileStatuses.reduce((acc, f) => acc + f.file.size, 0);
    const uploadedSize = fileStatuses.reduce((acc, f) => {
      if (f.status === 'success') return acc + f.file.size;
      if (f.status === 'uploading') return acc + (f.file.size * f.progress / 100);
      return acc;
    }, 0);

    const uploadingFiles = fileStatuses.filter(f => f.status === 'uploading');
    let estimatedTimeRemaining;
    
    if (uploadingFiles.length > 0 && uploadStats?.startTime) {
      const elapsed = Date.now() - uploadStats.startTime;
      const avgSpeed = uploadedSize / elapsed; // bytes per ms
      const remainingSize = totalSize - uploadedSize;
      estimatedTimeRemaining = remainingSize / avgSpeed;
    }

    return {
      totalFiles,
      completedFiles,
      failedFiles,
      totalSize,
      uploadedSize,
      startTime: uploadStats?.startTime || Date.now(),
      estimatedTimeRemaining
    };
  }, [fileStatuses, uploadStats]);

  // Update stats
  useEffect(() => {
    const stats = calculateStats();
    if (stats) {
      setUploadStats(stats);
    }
  }, [fileStatuses, calculateStats]);

  const removeFile = useCallback((fileId: string) => {
    // Cancel upload if in progress
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(fileId);
    }
    
    setFileStatuses(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const retryFile = useCallback((fileId: string) => {
    setFileStatuses(prev => 
      prev.map(status => 
        status.id === fileId 
          ? { ...status, status: 'pending', error: undefined, progress: 0 }
          : status
      )
    );
  }, []);

  const pauseResumeUpload = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      // Resume uploads
    } else {
      setIsPaused(true);
      // Pause current uploads
      abortControllersRef.current.forEach(controller => {
        controller.abort();
      });
      abortControllersRef.current.clear();
      
      // Mark uploading files as paused
      setFileStatuses(prev => 
        prev.map(status => 
          status.status === 'uploading' 
            ? { ...status, status: 'paused' }
            : status
        )
      );
    }
  }, [isPaused]);

  const simulateProgress = (fileId: string, duration: number = 3000) => {
    let progress = 0;
    const interval = 50;
    const increment = 100 / (duration / interval);
    
    const timer = setInterval(() => {
      progress += increment + Math.random() * 10; // Add some variance
      progress = Math.min(progress, 95); // Cap at 95% until actual completion
      
      setFileStatuses(prev => 
        prev.map(status => 
          status.id === fileId && status.status === 'uploading'
            ? { ...status, progress: Math.round(progress) }
            : status
        )
      );
      
      if (progress >= 95) {
        clearInterval(timer);
      }
    }, interval);
    
    return () => clearInterval(timer);
  };

  const uploadSingleFile = async (fileStatus: FileUploadStatus): Promise<void> => {
    const { file, id } = fileStatus;
    
    // Create abort controller
    const controller = new AbortController();
    abortControllersRef.current.set(id, controller);
    
    try {
      // Update status to uploading
      setFileStatuses(prev => 
        prev.map(status => 
          status.id === id 
            ? { ...status, status: 'uploading', uploadStartTime: Date.now(), progress: 0 }
            : status
        )
      );

      // Start progress simulation
      const stopProgress = simulateProgress(id);
      
      try {
        const result = await uploadDocument(file, selectedFolder || undefined, selectedPrimaryFolder || undefined);
        stopProgress();
        
        // Complete progress and mark as success
        setFileStatuses(prev => 
          prev.map(status => 
            status.id === id 
              ? { 
                  ...status, 
                  status: 'success', 
                  progress: 100, 
                  result,
                  uploadEndTime: Date.now()
                }
              : status
          )
        );
      } catch (error) {
        stopProgress();
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFileStatuses(prev => 
        prev.map(status => 
          status.id === id 
            ? { 
                ...status, 
                status: 'error', 
                error: errorMessage, 
                progress: 0,
                retryCount: status.retryCount + 1
              }
            : status
        )
      );
    } finally {
      abortControllersRef.current.delete(id);
    }
  };

  const handleUpload = async () => {
    if (!isInitialized || fileStatuses.length === 0) return;

    setIsUploading(true);
    setIsPaused(false);
    setUploadStats({
      totalFiles: fileStatuses.length,
      completedFiles: 0,
      failedFiles: 0,
      totalSize: fileStatuses.reduce((acc, f) => acc + f.file.size, 0),
      uploadedSize: 0,
      startTime: Date.now()
    });
    
    try {
      const pendingFiles = fileStatuses.filter(f => f.status === 'pending' || f.status === 'paused');
      
      // Process files in batches
      for (let i = 0; i < pendingFiles.length; i += maxConcurrentUploads) {
        if (isPaused) break;
        
        const batch = pendingFiles.slice(i, i + maxConcurrentUploads);
        const uploadPromises = batch.map(fileStatus => uploadSingleFile(fileStatus));
        
        await Promise.allSettled(uploadPromises);
      }

      // Final statistics
      const finalStats = calculateStats();
      if (finalStats) {
        const { completedFiles, failedFiles, totalFiles } = finalStats;
        
        if (completedFiles > 0) {
          toast.success(`🎉 ${completedFiles}/${totalFiles} documents uploaded successfully!`);
          onUploadComplete?.();
        }
        
        if (failedFiles > 0) {
          toast.error(`⚠️ ${failedFiles} upload(s) failed. You can retry individual files.`);
        }
        
        if (completedFiles > 0 && failedFiles === 0) {
          setTimeout(() => onClose(), 2000); // Auto-close on complete success
        }
      }
    } catch (error) {
      toast.error('Upload process failed');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

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
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          <GlassCard className="relative flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-2xl font-bold">Upload Documents</h2>
                {uploadStats && (
                  <p className="text-sm text-white/60 mt-1">
                    {uploadStats.completedFiles}/{uploadStats.totalFiles} completed • {formatFileSize(uploadStats.uploadedSize)}/{formatFileSize(uploadStats.totalSize)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isUploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={pauseResumeUpload}
                    className="px-3 py-2"
                  >
                    {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
                  <X size={20} />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Primary Folder Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    🗂️ Category
                  </label>
                  <select
                    value={selectedPrimaryFolder}
                    onChange={(e) => setSelectedPrimaryFolder(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                             focus:border-primary focus:ring-1 focus:ring-primary/20 
                             text-white transition-all text-sm"
                    disabled={isUploading || loadingPrimaryFolders}
                  >
                    <option value="">Select Category</option>
                    {primaryFolders.map((folder) => (
                      <option key={folder.id} value={folder.id} className="bg-gray-800">
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  {loadingPrimaryFolders && (
                    <p className="text-xs text-white/50 mt-1">Loading categories...</p>
                  )}
                </div>

                {/* Sub-Folder Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Folder size={14} className="inline mr-1" />
                    Sub-Folder
                  </label>
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                             focus:border-primary focus:ring-1 focus:ring-primary/20 
                             text-white transition-all text-sm"
                    disabled={isUploading}
                  >
                    <option value="">No Sub-Folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id} className="bg-gray-800">
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Concurrent Uploads */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Concurrent Uploads
                  </label>
                  <select
                    value={maxConcurrentUploads}
                    onChange={(e) => setMaxConcurrentUploads(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                             focus:border-primary focus:ring-1 focus:ring-primary/20 
                             text-white transition-all text-sm"
                    disabled={isUploading}
                  >
                    <option value={1}>1 file at a time</option>
                    <option value={2}>2 files at a time</option>
                    <option value={3}>3 files at a time</option>
                    <option value={5}>5 files at a time</option>
                  </select>
                </div>
              </div>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-6',
                  'hover:border-white/40',
                  isDragActive && !isDragReject && 'border-primary bg-primary/10',
                  isDragReject && 'border-red-400 bg-red-400/10',
                  !isInitialized && 'opacity-50 cursor-not-allowed',
                  fileStatuses.length === 0 ? 'border-white/20' : 'border-white/10'
                )}
              >
                <input {...getInputProps()} />
                <Upload size={48} className={cn(
                  "mx-auto mb-4",
                  isDragActive && !isDragReject ? "text-primary" : "text-white/60"
                )} />
                <p className="text-lg font-medium mb-2">
                  {isDragActive 
                    ? isDragReject 
                      ? 'Invalid file type'
                      : 'Drop files here'
                    : 'Drag & drop files here'
                  }
                </p>
                <p className="text-sm text-white/60 mb-2">
                  or click to browse from your computer
                </p>
                <p className="text-xs text-white/40">
                  Supports PDF, Word, Excel, and Text files • Max 50MB per file
                </p>
              </div>

              {/* Upload Progress Overview */}
              {isUploading && uploadStats && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 glass-dark rounded-xl border border-primary/20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span className="font-medium">
                        {isPaused ? 'Upload Paused' : 'Uploading...'}
                      </span>
                    </div>
                    {uploadStats.estimatedTimeRemaining && (
                      <div className="text-sm text-white/60 flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(uploadStats.estimatedTimeRemaining)} remaining
                      </div>
                    )}
                  </div>
                  
                  {/* Overall Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(uploadStats.uploadedSize / uploadStats.totalSize) * 100}%` 
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>
                      {uploadStats.completedFiles} of {uploadStats.totalFiles} files completed
                    </span>
                    <span>
                      {Math.round((uploadStats.uploadedSize / uploadStats.totalSize) * 100)}%
                    </span>
                  </div>
                </motion.div>
              )}

              {/* File List */}
              {fileStatuses.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">
                      Files ({fileStatuses.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUploadDetails(!showUploadDetails)}
                      className="text-sm px-3 py-1"
                    >
                      {showUploadDetails ? 'Hide Details' : 'Show Details'}
                      <Eye size={14} className="ml-1" />
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showUploadDetails && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 max-h-60 overflow-y-auto"
                      >
                        {fileStatuses.map((fileStatus) => (
                          <motion.div
                            key={fileStatus.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                              "glass rounded-lg p-3",
                              fileStatus.status === 'success' && "border border-green-400/20 bg-green-400/5",
                              fileStatus.status === 'error' && "border border-red-400/20 bg-red-400/5",
                              fileStatus.status === 'uploading' && "border border-primary/20 bg-primary/5"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
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
                                {fileStatus.status === 'paused' && (
                                  <Pause size={12} className="absolute -top-1 -right-1 text-yellow-400" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium truncate pr-2">{fileStatus.file.name}</p>
                                  <span className="text-xs text-white/60 flex-shrink-0">
                                    {formatFileSize(fileStatus.file.size)}
                                  </span>
                                </div>
                                
                                {/* Progress Bar */}
                                {fileStatus.status === 'uploading' && (
                                  <div className="w-full bg-white/10 rounded-full h-1.5 mb-1">
                                    <div 
                                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                      style={{ width: `${fileStatus.progress}%` }}
                                    />
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 text-white/60">
                                    {fileStatus.status === 'pending' && (
                                      <span>Waiting...</span>
                                    )}
                                    {fileStatus.status === 'uploading' && (
                                      <span className="text-primary">
                                        Uploading... {fileStatus.progress}%
                                      </span>
                                    )}
                                    {fileStatus.status === 'paused' && (
                                      <span className="text-yellow-400">Paused</span>
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
                                  
                                  <div className="flex items-center gap-1">
                                    {fileStatus.status === 'error' && fileStatus.retryCount < 3 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => retryFile(fileStatus.id)}
                                        className="p-1 text-xs"
                                        disabled={isUploading}
                                      >
                                        <RotateCcw size={12} />
                                      </Button>
                                    )}
                                    {(fileStatus.status === 'pending' || fileStatus.status === 'error') && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFile(fileStatus.id)}
                                        className="p-1 text-xs text-red-400 hover:text-red-300"
                                        disabled={isUploading}
                                      >
                                        <Trash2 size={12} />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-6 border-t border-white/10">
              <div className="text-sm text-white/60">
                {fileStatuses.length > 0 && (
                  <span>
                    {fileStatuses.filter(f => f.status === 'success').length} successful, 
                    {fileStatuses.filter(f => f.status === 'error').length} failed
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  disabled={isUploading && !isPaused}
                >
                  {isUploading ? 'Background' : 'Cancel'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpload}
                  disabled={fileStatuses.length === 0 || !isInitialized || (isUploading && !isPaused)}
                  className="flex items-center gap-2 min-w-[120px]"
                >
                  {isUploading ? (
                    isPaused ? (
                      <>
                        <Play size={16} />
                        Resume
                      </>
                    ) : (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Uploading...
                      </>
                    )
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload {fileStatuses.length} {fileStatuses.length === 1 ? 'File' : 'Files'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};