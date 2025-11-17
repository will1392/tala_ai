import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { googleDriveService, type DriveFile } from '../../services/googleDriveService';
import { useSearchService } from '../../hooks/useSearchService';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

interface GoogleDrivePickerProps {
  primaryFolderId?: string;
  folderId?: string;
  onComplete?: () => void;
  onFileUploaded?: () => void;
}

interface ImportStatus {
  file: DriveFile;
  status: 'pending' | 'importing' | 'success' | 'error';
  progress: number;
  error?: string;
}

export const GoogleDrivePicker = ({
  primaryFolderId,
  folderId,
  onComplete,
  onFileUploaded,
}: GoogleDrivePickerProps) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [importStatuses, setImportStatuses] = useState<ImportStatus[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const { uploadDocument } = useSearchService();

  const handlePickFiles = async () => {
    setIsInitializing(true);

    try {
      await googleDriveService.initialize();
      
      googleDriveService.showPicker(async (files) => {
        setIsInitializing(false);
        
        if (files.length === 0) {
          return;
        }

        // Initialize import statuses
        const statuses: ImportStatus[] = files.map(file => ({
          file,
          status: 'pending',
          progress: 0,
        }));
        setImportStatuses(statuses);
        setIsImporting(true);

        // Import files sequentially
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          try {
            // Update status to importing
            setImportStatuses(prev => 
              prev.map((s, idx) => 
                idx === i ? { ...s, status: 'importing', progress: 25 } : s
              )
            );

            // Download file from Google Drive
            const blob = await googleDriveService.downloadFile(file.id);
            
            setImportStatuses(prev =>
              prev.map((s, idx) =>
                idx === i ? { ...s, progress: 50 } : s
              )
            );

            // Convert Blob to File object
            const fileObj = new File([blob], file.name, { type: file.mimeType });

            setImportStatuses(prev =>
              prev.map((s, idx) =>
                idx === i ? { ...s, progress: 75 } : s
              )
            );

            // Upload to knowledge base
            await uploadDocument(fileObj, primaryFolderId, folderId);

            // Update status to success
            setImportStatuses(prev =>
              prev.map((s, idx) =>
                idx === i ? { ...s, status: 'success', progress: 100 } : s
              )
            );

            onFileUploaded?.();
            toast.success(`Imported ${file.name}`);

          } catch (error) {
            console.error(`Error importing ${file.name}:`, error);
            setImportStatuses(prev =>
              prev.map((s, idx) =>
                idx === i 
                  ? { 
                      ...s, 
                      status: 'error', 
                      error: error instanceof Error ? error.message : 'Failed to import file'
                    } 
                  : s
              )
            );
            toast.error(`Failed to import ${file.name}`);
          }
        }

        setIsImporting(false);
        
        // If all files succeeded, close after a delay
        setTimeout(() => {
          const allSucceeded = statuses.every(s => s.status === 'success');
          if (allSucceeded) {
            onComplete?.();
          }
        }, 1500);
      });

    } catch (error) {
      console.error('Error opening Google Drive picker:', error);
      toast.error('Failed to open Google Drive picker');
      setIsInitializing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Picker Button */}
      {importStatuses.length === 0 && (
        <Button
          variant="secondary"
          onClick={handlePickFiles}
          disabled={isInitializing}
          className="w-full"
        >
          {isInitializing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting to Google Drive...
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4 mr-2" />
              Import from Google Drive
            </>
          )}
        </Button>
      )}

      {/* Import Progress */}
      {importStatuses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium text-[var(--fg)]">
            <span>Importing from Google Drive</span>
            <span>
              {importStatuses.filter(s => s.status === 'success').length} / {importStatuses.length}
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {importStatuses.map((status, index) => (
              <motion.div
                key={status.file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'p-3 rounded-lg border',
                  status.status === 'success' && 'border-green-500/30 bg-green-500/5',
                  status.status === 'error' && 'border-red-500/30 bg-red-500/5',
                  status.status === 'importing' && 'border-[var(--primary)]/30 bg-[var(--primary)]/5',
                  status.status === 'pending' && 'border-[var(--border)] bg-[var(--muted)]'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {status.status === 'importing' && (
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)] flex-shrink-0" />
                    )}
                    {status.status === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                    {status.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--fg)] truncate">
                        {status.file.name}
                      </p>
                      {status.error && (
                        <p className="text-xs text-red-500 mt-1">{status.error}</p>
                      )}
                    </div>
                  </div>

                  {status.status === 'importing' && (
                    <span className="text-xs text-[var(--muted)] ml-2 flex-shrink-0">
                      {status.progress}%
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {status.status === 'importing' && (
                  <div className="mt-2 w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-[var(--primary)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${status.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {!isImporting && (
            <Button
              variant="secondary"
              onClick={() => {
                setImportStatuses([]);
                onComplete?.();
              }}
              className="w-full mt-4"
            >
              Done
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
