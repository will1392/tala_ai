import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2, Folder, FolderPlus, Plus } from 'lucide-react';
import type { Folder as FolderType } from '../../services/folderService';
import { folderService } from '../../services/folderService';
import type { PrimaryFolder } from '../../types/primaryFolder';
import { useToast } from '../toast/ToastProvider';
import { normalizeError } from '../../lib/errors';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Label } from '../ui/Label';
import { Card, CardContent } from '../ui/Card';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryFolders: PrimaryFolder[];
  subfolders: FolderType[];
  selectedFolderId?: string | null;
  onUploadComplete: () => void;
}

interface FileUploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  documentId?: string;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  primaryFolders,
  subfolders,
  selectedFolderId,
  onUploadComplete
}) => {
  const { push: pushToast } = useToast();
  const { user } = useAuthStore();
  
  // Debug: Log what we receive
  useEffect(() => {
    if (isOpen) {
      console.log('=== DocumentUploadModal Debug ===');
      console.log('Received primaryFolders:', primaryFolders);
      console.log('Received subfolders:', subfolders);
      console.log('Received selectedFolderId:', selectedFolderId);
      console.log('Subfolders count:', subfolders?.length || 0);
      if (subfolders?.length > 0) {
        console.log('First subfolder structure:', subfolders[0]);
        console.log('Subfolders with primaryFolderId:', subfolders.filter(sf => sf.primaryFolderId).length);
      }
    }
  }, [isOpen, primaryFolders, subfolders, selectedFolderId]);
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploadResult, setUploadResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [successfulUploadCount, setSuccessfulUploadCount] = useState(0);
  
  // Initialize selected folders - handle case where selectedFolderId might be a subfolder
  const getInitialFolders = () => {
    if (!selectedFolderId) return { primary: '', sub: '' };
    
    // Check if it's a primary folder
    const isPrimary = primaryFolders.some(pf => pf.id === selectedFolderId);
    if (isPrimary) {
      return { primary: selectedFolderId, sub: '' };
    }
    
    // Check if it's a subfolder
    const subfolder = subfolders.find(sf => sf.id === selectedFolderId);
    if (subfolder && subfolder.primaryFolderId) {
      // Check if the primaryFolderId exists in our primary folders
      const primaryExists = primaryFolders.some(pf => pf.id === subfolder.primaryFolderId);
      if (primaryExists) {
        return { primary: subfolder.primaryFolderId, sub: selectedFolderId };
      }
      
      // Handle legacy ID - find the matching primary folder by name
      if (subfolder.primaryFolderId === '37b2dff2-fa91-46c7-bd30-c28715178bf0') {
        const destFolder = primaryFolders.find(pf => pf.name === 'Destinations' || pf.slug === 'destinations');
        if (destFolder) {
          return { primary: destFolder.id, sub: selectedFolderId };
        }
      } else if (subfolder.primaryFolderId === 'bf380526-3fd8-41b0-bd63-a85a60ccc2ad') {
        const suppFolder = primaryFolders.find(pf => pf.name === 'Suppliers' || pf.slug === 'suppliers');
        if (suppFolder) {
          return { primary: suppFolder.id, sub: selectedFolderId };
        }
      }
    }
    
    return { primary: '', sub: '' };
  };
  
  const initialFolders = getInitialFolders();
  const [selectedPrimaryFolder, setSelectedPrimaryFolder] = useState<string>(initialFolders.primary);
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>(initialFolders.sub);

  useEffect(() => {
    if (isOpen) {
      setUploadResult('idle');
      setSuccessfulUploadCount(0);
    } else {
      setFileStatuses([]);
      setIsUploading(false);
      setShowCreateFolder(false);
      setNewFolderName('');
      setUploadResult('idle');
      setSuccessfulUploadCount(0);
    }
  }, [isOpen]);
  
  // Get subfolders for selected primary folder
  // Need to handle legacy ID mapping
  const getAvailableSubfolders = () => {
    console.log('Getting subfolders for primary folder:', selectedPrimaryFolder);
    
    if (!selectedPrimaryFolder || !subfolders || subfolders.length === 0) {
      console.log('No primary folder selected or no subfolders available');
      return [];
    }
    
    // Find the selected primary folder
    const primaryFolder = primaryFolders.find(pf => pf.id === selectedPrimaryFolder);
    console.log('Selected primary folder:', primaryFolder);
    
    // Collect all matching subfolders using multiple strategies
    let allMatchingSubfolders: FolderType[] = [];
    
    // Strategy 1: Direct ID match
    const directMatches = subfolders.filter(sf => 
      sf.primaryFolderId === selectedPrimaryFolder
    );
    console.log(`Strategy 1 (Direct ID match): found ${directMatches.length} folders`);
    allMatchingSubfolders = [...directMatches];
    
    // Strategy 2: ALWAYS check legacy ID mappings for Destinations and Suppliers
    if (primaryFolder) {
      const legacyMappings: Record<string, string[]> = {
        'Destinations': ['37b2dff2-fa91-46c7-bd30-c28715178bf0'],
        'destinations': ['37b2dff2-fa91-46c7-bd30-c28715178bf0'],
        'Suppliers': ['bf380526-3fd8-41b0-bd63-a85a60ccc2ad'],
        'suppliers': ['bf380526-3fd8-41b0-bd63-a85a60ccc2ad']
      };
      
      const possibleLegacyIds = [
        ...(legacyMappings[primaryFolder.name] || []),
        ...(legacyMappings[primaryFolder.slug || ''] || [])
      ];
      
      if (possibleLegacyIds.length > 0) {
        console.log('Checking legacy IDs:', possibleLegacyIds);
        const legacyMatches = subfolders.filter(sf => 
          possibleLegacyIds.includes(sf.primaryFolderId || '')
        );
        console.log(`Strategy 2 (Legacy IDs): found ${legacyMatches.length} folders`);
        
        // Add legacy matches that aren't already in the list
        legacyMatches.forEach(lm => {
          if (!allMatchingSubfolders.some(sf => sf.id === lm.id)) {
            allMatchingSubfolders.push(lm);
          }
        });
      }
    }
    
    // Strategy 3: Name-based matching (additional fallback)
    if (primaryFolder) {
      // For Destinations, look for travel-related folders
      if (primaryFolder.name === 'Destinations' || primaryFolder.slug === 'destinations') {
        const destinationNames = ['france', 'italy', 'spain', 'greece', 'portugal', 'england', 'iceland', 'japan', 'australia'];
        const nameMatches = subfolders.filter(sf => {
          const folderNameLower = sf.name.toLowerCase();
          return destinationNames.some(name => folderNameLower.includes(name));
        });
        console.log(`Strategy 3 (Destinations name match): found ${nameMatches.length} folders`);
        
        // Add name matches that aren't already in the list
        nameMatches.forEach(nm => {
          if (!allMatchingSubfolders.some(sf => sf.id === nm.id)) {
            allMatchingSubfolders.push(nm);
          }
        });
      }
      // For Suppliers, look for supplier-related folders
      else if (primaryFolder.name === 'Suppliers' || primaryFolder.slug === 'suppliers') {
        const supplierNames = ['airlines', 'hotels', 'car rental', 'car-rental'];
        const nameMatches = subfolders.filter(sf => {
          const folderNameLower = sf.name.toLowerCase();
          return supplierNames.some(name => folderNameLower.includes(name));
        });
        console.log(`Strategy 3 (Suppliers name match): found ${nameMatches.length} folders`);
        
        // Add name matches that aren't already in the list
        nameMatches.forEach(nm => {
          if (!allMatchingSubfolders.some(sf => sf.id === nm.id)) {
            allMatchingSubfolders.push(nm);
          }
        });
      }
    }
    
    console.log('Final matching subfolders:', allMatchingSubfolders.map(sf => ({ id: sf.id, name: sf.name, primaryFolderId: sf.primaryFolderId })));
    return allMatchingSubfolders;
  };
  
  const availableSubfolders = getAvailableSubfolders();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newStatuses = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const
    }));
    setUploadResult('idle');
    setSuccessfulUploadCount(0);
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
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.webm'],
      'video/mp4': ['.mp4'],
      'video/mpeg': ['.mpeg']
    },
    disabled: isUploading,
    multiple: true
  });

  const uploadFiles = async () => {
    if (fileStatuses.length === 0 || !selectedPrimaryFolder) {
      pushToast({
        kind: 'error',
        message: 'Please select files and a folder'
      });
      return;
    }

    setUploadResult('idle');
    setSuccessfulUploadCount(0);
    setIsUploading(true);

    let hasErrors = false;
    let successCount = 0;

    for (let i = 0; i < fileStatuses.length; i++) {
      const fileStatus = fileStatuses[i];
      if (fileStatus.status !== 'pending') continue;
      
      try {
        // Update status to uploading
        setFileStatuses(prev => prev.map((fs, idx) => 
          idx === i ? { ...fs, status: 'uploading' } : fs
        ));

        const formData = new FormData();
        formData.append('document', fileStatus.file);
        
        // Use actual logged-in user
        const userId = user?.id || 'admin-1';
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
        
        formData.append('userId', userId);
        formData.append('isAdmin', isAdmin ? 'true' : 'false');
        
        // Use 'public' visibility for all users
        // This allows uploads without requiring organization membership
        formData.append('visibility', 'public');
        
        // Use the correct primary folder ID for upload
        // If subfolders are using legacy IDs, we need to use the legacy primary folder ID too
        let uploadPrimaryFolderId = selectedPrimaryFolder;
        if (selectedSubfolder) {
          const subfolder = subfolders.find(sf => sf.id === selectedSubfolder);
          if (subfolder && subfolder.primaryFolderId && subfolder.primaryFolderId !== selectedPrimaryFolder) {
            // Use the subfolder's primary folder ID (might be legacy)
            uploadPrimaryFolderId = subfolder.primaryFolderId;
          }
        }
        
        formData.append('primaryFolderId', uploadPrimaryFolderId);
        if (selectedSubfolder) {
          formData.append('folderId', selectedSubfolder);
        }

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const uploadUrl = `${baseUrl}/documents/upload`;
        
        console.log('📤 Uploading to:', uploadUrl);
        console.log('📋 Upload details:', {
          userId,
          isAdmin,
          fileName: fileStatus.file.name,
          fileType: fileStatus.file.type,
          fileSize: fileStatus.file.size
        });
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'x-user-id': userId
          },
          body: formData
        });

        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          // Try to parse error response
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            // Response is not JSON
            const textError = await response.text();
            throw new Error(`HTTP ${response.status}: ${textError || response.statusText}`);
          }
          
          const errorMsg = errorData.error || errorData.message || `HTTP ${response.status}`;
          const errorDetails = errorData.details ? ` - ${errorData.details}` : '';
          throw new Error(errorMsg + errorDetails);
        }
        
        const result = await response.json();
        
        if (response.ok) {
          setFileStatuses(prev => prev.map((fs, idx) =>
            idx === i ? {
              ...fs,
              status: 'success',
              documentId: result.documentId
            } : fs
          ));
          successCount += 1;
          pushToast({
            kind: 'success',
            message: `Uploaded ${fileStatus.file.name}`
          });
        } else {
          // Extract error message from response
          const errorMsg = result.error || result.message || 'Upload failed';
          const errorDetails = result.details ? ` - ${result.details}` : '';
          throw new Error(errorMsg + errorDetails);
        }
      } catch (error) {
        console.error('Upload error:', error);
        console.error('Error details:', {
          type: typeof error,
          isError: error instanceof Error,
          message: error instanceof Error ? error.message : JSON.stringify(error),
          response: error
        });
        
        hasErrors = true;
        
        // Extract error message properly
        let errorMessage = 'Upload failed';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          errorMessage = (error as any).message || (error as any).error || JSON.stringify(error);
        }
        
        setFileStatuses(prev => prev.map((fs, idx) =>
          idx === i ? {
            ...fs,
            status: 'error',
            error: errorMessage
          } : fs
        ));
        
        pushToast({
          kind: 'error',
          title: 'Upload Error',
          message: `Failed to upload ${fileStatus.file.name}: ${errorMessage}`
        });
      }
    }
    
    setIsUploading(false);

    if (!hasErrors && successCount > 0) {
      setSuccessfulUploadCount(successCount);
      setUploadResult('success');
      setFileStatuses([]);
      onUploadComplete();
    } else if (hasErrors) {
      setUploadResult('error');
    }
  };

  const removeFile = (index: number) => {
    setFileStatuses(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFileStatuses([]);
    setSelectedPrimaryFolder('');
    setSelectedSubfolder('');
    setUploadResult('idle');
    setSuccessfulUploadCount(0);
  };

  const handleCloseModal = () => {
    onClose();
  };

  const handleStartAnotherUpload = () => {
    setUploadResult('idle');
    setSuccessfulUploadCount(0);
    setFileStatuses([]);
  };
  
  // Create new subfolder
  const handleCreateSubfolder = async () => {
    if (!selectedPrimaryFolder || !newFolderName.trim()) {
      pushToast({
        kind: 'error',
        message: 'Please select a primary folder and enter a folder name'
      });
      return;
    }
    
    setCreatingFolder(true);
    try {
      // Determine the correct primaryFolderId to use
      let primaryFolderIdForCreation = selectedPrimaryFolder;
      
      // Check if we need to use a legacy ID
      const primaryFolder = primaryFolders.find(pf => pf.id === selectedPrimaryFolder);
      if (primaryFolder) {
        // For Destinations, use the legacy ID if needed
        if (primaryFolder.name === 'Destinations' || primaryFolder.slug === 'destinations') {
          // Check if any existing subfolders use the legacy ID
          const hasLegacySubfolders = subfolders.some(sf => 
            sf.primaryFolderId === '37b2dff2-fa91-46c7-bd30-c28715178bf0'
          );
          if (hasLegacySubfolders) {
            primaryFolderIdForCreation = '37b2dff2-fa91-46c7-bd30-c28715178bf0';
          }
        }
        // For Suppliers, use the legacy ID if needed
        else if (primaryFolder.name === 'Suppliers' || primaryFolder.slug === 'suppliers') {
          const hasLegacySubfolders = subfolders.some(sf => 
            sf.primaryFolderId === 'bf380526-3fd8-41b0-bd63-a85a60ccc2ad'
          );
          if (hasLegacySubfolders) {
            primaryFolderIdForCreation = 'bf380526-3fd8-41b0-bd63-a85a60ccc2ad';
          }
        }
      }
      
      const newFolder = await folderService.createFolder('admin-1', {
        name: newFolderName.trim(),
        description: '',
        primaryFolderId: primaryFolderIdForCreation,
        userId: 'admin-1',
        isAdmin: true
      });
      
      // Add the new folder to the subfolders list
      subfolders.push(newFolder);
      
      // Select the newly created folder
      setSelectedSubfolder(newFolder.id);
      
      // Reset the create folder UI
      setShowCreateFolder(false);
      setNewFolderName('');
      
      pushToast({
        kind: 'success',
        message: `Created folder "${newFolder.name}"`
      });
    } catch (error) {
      console.error('Failed to create folder:', error);
      const normalizedError = normalizeError(error);
      pushToast({
        kind: 'error',
        title: 'Failed to create folder',
        message: normalizedError.message
      });
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title="Upload Documents"
      size="lg"
      showCloseButton={true}
      role="dialog"
      aria-labelledby="upload-modal-title"
    >
      {uploadResult === 'success' ? (
        <div className="flex flex-col items-center justify-center text-center py-12 px-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle size={36} className="text-green-500" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Upload successful</h3>
            <p className="text-sm text-[var(--muted)]">
              {successfulUploadCount === 1
                ? 'Your document was uploaded successfully.'
                : `${successfulUploadCount} documents were uploaded successfully.`}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              size="md"
              onClick={handleStartAnotherUpload}
            >
              Upload more
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCloseModal}
            >
              Close
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-y-auto max-h-[calc(80vh-180px)]">
            {/* Folder Selection */}
            <div className="mb-6 space-y-3" role="group" aria-labelledby="folder-selection-group">
          <h3 id="folder-selection-group" className="sr-only">Folder Selection</h3>
          <div>
            <Label htmlFor="primary-folder-select" required>Primary Folder</Label>
            <Select
              id="primary-folder-select"
              value={selectedPrimaryFolder}
              onChange={(e) => {
                setSelectedPrimaryFolder(e.target.value);
                setSelectedSubfolder(''); // Reset subfolder
              }}
              placeholder="Select a folder..."
              options={[
                ...primaryFolders.map(folder => ({
                  value: folder.id,
                  label: folder.name
                }))
              ]}
              disabled={isUploading}
              aria-required="true"
              aria-describedby="primary-folder-help"
            />
            <span id="primary-folder-help" className="sr-only">Select the primary folder where documents will be uploaded</span>
          </div>

          {selectedPrimaryFolder && (
            <div>
              <Label htmlFor="subfolder-select">
                Subfolder (Optional)
                {availableSubfolders.length > 0 && (
                  <span className="text-xs text-[var(--muted)] ml-2">({availableSubfolders.length} available)</span>
                )}
              </Label>
              
              {!showCreateFolder ? (
                <div className="flex gap-2">
                  <Select
                    id="subfolder-select"
                    value={selectedSubfolder}
                    onChange={(e) => setSelectedSubfolder(e.target.value)}
                    placeholder="No subfolder"
                    options={[
                      { value: '', label: 'No subfolder' },
                      ...availableSubfolders.map(folder => ({
                        value: folder.id,
                        label: folder.name
                      }))
                    ]}
                    disabled={isUploading || creatingFolder}
                    className="flex-1"
                    aria-describedby="subfolder-help"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowCreateFolder(true)}
                    variant="secondary"
                    size="md"
                    disabled={isUploading || creatingFolder}
                    aria-label="Create new subfolder"
                  >
                    <FolderPlus size={16} aria-hidden="true" />
                    New
                  </Button>
                  <span id="subfolder-help" className="sr-only">Optionally select a subfolder within the primary folder</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSubfolder();
                      } else if (e.key === 'Escape') {
                        setShowCreateFolder(false);
                        setNewFolderName('');
                      }
                    }}
                    placeholder="Enter folder name..."
                    className="flex-1"
                    autoFocus
                    disabled={creatingFolder}
                  />
                  <Button
                    type="button"
                    onClick={handleCreateSubfolder}
                    variant="primary"
                    size="md"
                    disabled={!newFolderName.trim() || creatingFolder}
                  >
                    {creatingFolder ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    Create
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowCreateFolder(false);
                      setNewFolderName('');
                    }}
                    variant="secondary"
                    size="md"
                    disabled={creatingFolder}
                  >
                    Cancel
                  </Button>
                </div>
                  )}
                  
              {showCreateFolder && (
                <p className="text-xs text-[var(--muted)] mt-2">
                  Press Enter to create, Escape to cancel
                </p>
              )}
            </div>
          )}
        </div>

        {/* Dropzone */}
        <Card variant="bordered" className="mb-6">
          <CardContent
            {...getRootProps()}
            className={`
              p-8 text-center cursor-pointer transition-colors
              border-2 border-dashed rounded-lg
              ${isDragActive 
                ? 'border-[var(--primary)] bg-[var(--primary)]/5' 
                : 'border-[var(--border)] hover:border-[var(--primary)]'
              }
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            role="button"
            tabIndex={0}
            aria-label="Drop zone for file upload"
            aria-describedby="dropzone-description"
          >
            <input {...getInputProps()} aria-label="File input" />
            <Upload size={48} className="mx-auto mb-4 text-[var(--muted)]" aria-hidden="true" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-[var(--muted)]">
              or click to browse
            </p>
            <p id="dropzone-description" className="text-xs text-[var(--muted)] mt-2">
              Supported: PDF, Word, Excel, Text, Markdown, Images
            </p>
          </CardContent>
        </Card>

        {/* File List */}
        {fileStatuses.length > 0 && (
          <div className="space-y-2" role="region" aria-labelledby="file-list-heading">
            <div className="flex items-center justify-between mb-2">
              <h3 id="file-list-heading" className="text-sm font-medium">Files ({fileStatuses.length})</h3>
              <Button
                onClick={clearAll}
                variant="ghost"
                size="sm"
                disabled={isUploading}
                className="text-red-600 hover:text-red-700"
                aria-label="Clear all files"
              >
                Clear all
              </Button>
            </div>
            
            {fileStatuses.map((fileStatus, index) => (
              <Card key={index} variant="default">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FileText size={20} className="text-[var(--muted)]" />
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">
                          {fileStatus.file.name}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {fileStatus.status === 'pending' && (
                        <Button
                          onClick={() => removeFile(index)}
                          variant="ghost"
                          size="sm"
                          disabled={isUploading}
                          className="p-1"
                          aria-label={`Remove ${fileStatus.file.name}`}
                        >
                          <X size={16} aria-hidden="true" />
                        </Button>
                      )}
                      {fileStatus.status === 'uploading' && (
                        <Loader2 size={16} className="animate-spin text-[var(--primary)]" aria-label="Uploading" />
                      )}
                      {fileStatus.status === 'success' && (
                        <CheckCircle size={16} className="text-green-500" aria-label="Upload successful" />
                      )}
                      {fileStatus.status === 'error' && (
                        <div className="flex items-center gap-1" role="alert">
                          <AlertCircle size={16} className="text-red-500" aria-hidden="true" />
                          <span className="text-xs text-red-500">{fileStatus.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]" role="group" aria-label="Modal actions">
            <Button
              onClick={handleCloseModal}
              variant="secondary"
              size="md"
              disabled={isUploading}
              aria-label="Cancel upload"
            >
              Cancel
            </Button>
            <Button
              onClick={uploadFiles}
              disabled={fileStatuses.length === 0 || !selectedPrimaryFolder || isUploading}
              variant="primary"
              size="md"
              aria-label={isUploading ? 'Uploading files' : `Upload ${fileStatuses.length} files`}
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} aria-hidden="true" />
                  Upload {fileStatuses.length > 0 ? `(${fileStatuses.length})` : ''}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};