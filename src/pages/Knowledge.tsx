import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Grid, List, AlertCircle, Loader2, FolderPlus, Folder, ArrowLeft, Plus, ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { Button } from '../components/shared/Button';
import { SearchResultsSummary } from '../components/knowledge/SearchResultsSummary';
import { SelectableDocumentCard } from '../components/knowledge/SelectableDocumentCard';
import { BulkActionsToolbar } from '../components/knowledge/BulkActionsToolbar';
import { BulkMoveModal } from '../components/knowledge/BulkMoveModal';
import { EnhancedUploadZone } from '../components/knowledge/EnhancedUploadZone';
import { GlobalDragDropOverlay } from '../components/knowledge/GlobalDragDropOverlay';
import { FloatingUploadProgress } from '../components/knowledge/FloatingUploadProgress';
import { DocumentViewer } from '../components/knowledge/DocumentViewer';
import { CreateFolderModal } from '../components/knowledge/CreateFolderModal';
import { EditFolderModal } from '../components/knowledge/EditFolderModal';
import { DeleteFolderModal } from '../components/knowledge/DeleteFolderModal';
import { FolderTree } from '../components/knowledge/FolderTree';
import { ComprehensiveSearchInterface } from '../components/knowledge/ComprehensiveSearchInterface';
import { QuickSearchShortcut } from '../components/knowledge/QuickSearchShortcut';
import { DeleteDocumentModal } from '../components/knowledge/DeleteDocumentModal';
import { MoveDocumentModal } from '../components/knowledge/MoveDocumentModal';
import { PrimaryFolderCard } from '../components/knowledge/PrimaryFolderCard';
import { CreatePrimaryFolderModal } from '../components/knowledge/CreatePrimaryFolderModal';
import { EditPrimaryFolderModal } from '../components/knowledge/EditPrimaryFolderModal';
import { DeletePrimaryFolderModal } from '../components/knowledge/DeletePrimaryFolderModal';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { TagManager } from '../components/knowledge/TagManager';
import { TagFilter } from '../components/knowledge/TagFilter';
import { useSearchService } from '../hooks/useSearchService';
import { folderService, type Folder as FolderType } from '../services/folderService';
import { primaryFolderService } from '../services/primaryFolderService';
import { ApiSearchService } from '../services/apiSearchService';
import { tagService } from '../services/tagService';
import type { PrimaryFolder } from '../types/primaryFolder';
import type { TagFilter as TagFilterType } from '../types/tags';
import { cn } from '../utils/cn';

export const Knowledge = () => {
  // Navigation state
  const [currentView, setCurrentView] = useState<'primary-folders' | 'folder-contents'>('primary-folders');
  const [selectedPrimaryFolder, setSelectedPrimaryFolder] = useState<PrimaryFolder | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // UI state
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  
  // Primary folders state
  const [primaryFolders, setPrimaryFolders] = useState<PrimaryFolder[]>([]);
  const [loadingPrimaryFolders, setLoadingPrimaryFolders] = useState(false);
  
  // Sub-folders state
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  
  // Documents state
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<{id: string, title: string} | null>(null);
  const [movingDocument, setMovingDocument] = useState<{id: string, title: string, folderId?: string} | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Primary folder modals state
  const [showCreatePrimaryFolder, setShowCreatePrimaryFolder] = useState(false);
  const [editingPrimaryFolder, setEditingPrimaryFolder] = useState<PrimaryFolder | null>(null);
  const [deletingPrimaryFolder, setDeletingPrimaryFolder] = useState<PrimaryFolder | null>(null);
  
  // Bulk operations state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  
  // Enhanced upload state
  const [backgroundUploads, setBackgroundUploads] = useState<Array<{
    id: string;
    fileName: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error' | 'paused';
    error?: string;
  }>>([]);
  
  // Folder structure collapsible state
  const [isFolderStructureExpanded, setIsFolderStructureExpanded] = useState(false);
  
  // Comprehensive search state
  const [showComprehensiveSearch, setShowComprehensiveSearch] = useState(false);
  
  // Tag management state
  const [showTagManager, setShowTagManager] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<TagFilterType | null>(null);
  const [tagFilteredDocuments, setTagFilteredDocuments] = useState<any[]>([]);

  const {
    searchResults,
    isSearching,
    isInitialized,
    isInitializing,
    serviceInfo,
    search,
    clearResults,
    error,
    clearError,
    totalResults,
    processingTime
  } = useSearchService();

  // Create API service instance
  const apiService = new ApiSearchService();

  // Load primary folders on mount
  useEffect(() => {
    const loadPrimaryFolders = async () => {
      if (!isInitialized) return;
      
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
  }, [isInitialized]);

  // Load folders when primary folder changes (sub-folders)
  useEffect(() => {
    const loadFolders = async () => {
      if (!isInitialized || currentView !== 'folder-contents') return;
      
      setLoadingFolders(true);
      try {
        const userFolders = await folderService.getFolders('admin-1', true);
        // Filter folders by primary folder if one is selected
        const filteredFolders = selectedPrimaryFolder 
          ? userFolders.filter(folder => folder.primaryFolderId === selectedPrimaryFolder.id)
          : userFolders;
        
        setFolders(filteredFolders);
      } catch (err) {
        console.warn('Failed to load folders:', err);
      } finally {
        setLoadingFolders(false);
      }
    };

    loadFolders();
  }, [isInitialized, selectedPrimaryFolder, currentView]);

  // Load all documents when folder or primary folder changes
  useEffect(() => {
    const loadDocuments = async () => {
      if (!isInitialized || searchQuery) return; // Don't load if there's an active search
      
      setLoadingDocuments(true);
      try {
        const result = await apiService.getDocuments(
          'admin-1',
          true,
          selectedFolder === 'all' ? undefined : selectedFolder,
          selectedFolder === 'all' ? 50 : 10, // More documents for "all" view, 10 for specific folders
          0, // offset
          selectedPrimaryFolder?.id // primaryFolderId
        );
        setAllDocuments(result.documents);
      } catch (err) {
        console.warn('Failed to load documents:', err);
        setAllDocuments([]);
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadDocuments();
  }, [isInitialized, selectedFolder, selectedPrimaryFolder, searchQuery]);

  // Handle tag filtering
  const handleTagFilterChange = useCallback(async (filter: TagFilterType | null) => {
    setActiveTagFilter(filter);
    
    if (!filter) {
      setTagFilteredDocuments([]);
      return;
    }

    try {
      const results = await tagService.searchByTags(filter, 'admin-1', 50);
      const documents = results
        .filter(result => result.item.type === 'document')
        .map(result => result.item);
      setTagFilteredDocuments(documents);
    } catch (error) {
      console.error('Failed to filter by tags:', error);
      setTagFilteredDocuments([]);
    }
  }, []);

  // Keyboard shortcuts for bulk operations and search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to open comprehensive search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowComprehensiveSearch(true);
      }
      
      // Escape to close search or exit selection mode
      if (e.key === 'Escape') {
        if (showComprehensiveSearch) {
          setShowComprehensiveSearch(false);
        } else if (isSelectionMode) {
          handleExitSelectionMode();
        }
      }
      
      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && isSelectionMode) {
        e.preventDefault();
        handleSelectAll();
      }
      
      // Delete key to delete selected
      if (e.key === 'Delete' && isSelectionMode && selectedDocuments.size > 0) {
        handleBulkDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, selectedDocuments.size, showComprehensiveSearch]);

  // Handle search
  const handleSearch = async (query: string, searchFilters?: any) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      clearResults();
      setSearchQuery('');
      return;
    }

    // Add to recent searches
    if (!recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]); // Keep last 5 searches
    }

    // Combine folder filter with search filters
    const filters = {
      ...searchFilters,
      folderId: selectedFolder === 'all' ? undefined : selectedFolder,
      primaryFolderId: currentView === 'folder-contents' && selectedPrimaryFolder ? selectedPrimaryFolder.id : undefined
    };

    await search(query, filters);
  };

  // Handle primary folder selection
  const handlePrimaryFolderSelect = useCallback((primaryFolder: PrimaryFolder) => {
    setSelectedPrimaryFolder(primaryFolder);
    setCurrentView('folder-contents');
    setSelectedFolder('all');
    
    // Clear search when changing primary folders
    if (searchQuery) {
      clearResults();
      setSearchQuery('');
    }
  }, [searchQuery, clearResults]);

  // Handle back to primary folders
  const handleBackToPrimaryFolders = useCallback(() => {
    setCurrentView('primary-folders');
    setSelectedPrimaryFolder(null);
    setSelectedFolder('all');
    
    // Clear search when going back
    if (searchQuery) {
      clearResults();
      setSearchQuery('');
    }
  }, [searchQuery, clearResults]);

  // Handle folder change
  const handleFolderChange = async (folderId: string) => {
    setSelectedFolder(folderId);
    
    // Clear search when changing folders
    if (searchQuery) {
      clearResults();
      setSearchQuery('');
    }
  };

  // Handle folder creation
  const handleCreateFolder = async (name: string, description?: string) => {
    try {
      console.log('Creating folder:', { name, description, primaryFolderId: selectedPrimaryFolder?.id });
      
      await folderService.createFolder({
        name,
        description,
        userId: 'admin-1',
        isAdmin: true,
        primaryFolderId: selectedPrimaryFolder?.id,
      });
      
      console.log('Folder created successfully, reloading data...');
      
      // Reload folders
      const userFolders = await folderService.getFolders('admin-1', true);
      const filteredFolders = selectedPrimaryFolder 
        ? userFolders.filter(folder => folder.primaryFolderId === selectedPrimaryFolder.id)
        : userFolders;
      setFolders(filteredFolders);
      
      // Reload primary folders to update counts
      const primaryFoldersData = await primaryFolderService.getPrimaryFolders('admin-1', true);
      setPrimaryFolders(primaryFoldersData);
      
      console.log('Data reloaded successfully');
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error; // Re-throw so modal can handle the error
    }
  };

  // Handle folder edit
  const handleEditFolder = async (name: string, description?: string) => {
    if (!editingFolder) return;
    
    await folderService.updateFolder(editingFolder.id, {
      name,
      description,
    }, 'admin-1');
    
    // Reload folders
    const userFolders = await folderService.getFolders('admin-1', true);
    const filteredFolders = selectedPrimaryFolder 
      ? userFolders.filter(folder => folder.primaryFolderId === selectedPrimaryFolder.id)
      : userFolders;
    setFolders(filteredFolders);
    
    // Reload primary folders to update counts
    const primaryFoldersData = await primaryFolderService.getPrimaryFolders('admin-1', true);
    setPrimaryFolders(primaryFoldersData);
    setEditingFolder(null);
  };

  // Handle folder delete
  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;
    
    await folderService.deleteFolder(deletingFolder.id, 'admin-1');
    
    // If we're viewing the deleted folder, switch to all documents
    if (selectedFolder === deletingFolder.id) {
      setSelectedFolder('all');
    }
    
    // Reload folders
    const userFolders = await folderService.getFolders('admin-1', true);
    const filteredFolders = selectedPrimaryFolder 
      ? userFolders.filter(folder => folder.primaryFolderId === selectedPrimaryFolder.id)
      : userFolders;
    setFolders(filteredFolders);
    
    // Reload primary folders to update counts
    const primaryFoldersData = await primaryFolderService.getPrimaryFolders('admin-1', true);
    setPrimaryFolders(primaryFoldersData);
    setDeletingFolder(null);
  };

  // Handle folder move (drag and drop)
  const handleMoveFolder = async (folderId: string, newParentId: string, newParentType: 'primary' | 'subfolder') => {
    try {
      const response = await fetch(`http://localhost:3001/api/folders/${folderId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'admin-1',
          newParentId,
          newParentType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to move folder');
      }

      // Reload folders to reflect the change
      const userFolders = await folderService.getFolders('admin-1', true);
      const filteredFolders = selectedPrimaryFolder 
        ? userFolders.filter(folder => folder.primaryFolderId === selectedPrimaryFolder.id)
        : userFolders;
      setFolders(filteredFolders);
      
      // Reload primary folders to update counts
      const primaryFoldersData = await primaryFolderService.getPrimaryFolders('admin-1', true);
      setPrimaryFolders(primaryFoldersData);
      
      console.log(`📁 Successfully moved folder ${folderId} to ${newParentId} (${newParentType})`);
    } catch (error) {
      console.error('Failed to move folder:', error);
      // You might want to show a toast notification here
    }
  };

  // Primary folder handlers
  const handleCreatePrimaryFolder = async () => {
    // Reload primary folders
    try {
      const primaryFoldersData = await primaryFolderService.getPrimaryFolders('admin-1', true);
      setPrimaryFolders(primaryFoldersData);
    } catch (err) {
      console.warn('Failed to reload primary folders:', err);
    }
  };

  const handleEditPrimaryFolder = async () => {
    // Reload primary folders
    try {
      const primaryFoldersData = await primaryFolderService.getPrimaryFolders('admin-1', true);
      setPrimaryFolders(primaryFoldersData);
    } catch (err) {
      console.warn('Failed to reload primary folders:', err);
    }
    setEditingPrimaryFolder(null);
  };

  const handleDeletePrimaryFolder = async () => {
    // If we're viewing the deleted primary folder, go back to main view
    if (selectedPrimaryFolder && deletingPrimaryFolder && selectedPrimaryFolder.id === deletingPrimaryFolder.id) {
      handleBackToPrimaryFolders();
    }
    
    // Reload primary folders
    try {
      const primaryFoldersData = await primaryFolderService.getPrimaryFolders('admin-1', true);
      setPrimaryFolders(primaryFoldersData);
    } catch (err) {
      console.warn('Failed to reload primary folders:', err);
    }
    setDeletingPrimaryFolder(null);
  };

  // Handle document delete
  const handleDeleteDocument = async () => {
    if (!deletingDocument) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/documents/${deletingDocument.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'admin-1',
          isAdmin: 'true'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Reload documents
      if (searchQuery) {
        // If in search mode, re-run search
        search(searchQuery, selectedFolder !== 'all' ? { category: 'all' } : undefined);
      } else {
        // If browsing, reload all documents
        const result = await apiService.getDocuments(
          'admin-1',
          true,
          selectedFolder === 'all' ? undefined : selectedFolder,
          10,
          0,
          selectedPrimaryFolder?.id
        );
        setAllDocuments(result.documents);
      }

      // Reload folders to update document counts
      const userFolders = await folderService.getFolders('admin-1', true);
      setFolders(userFolders);
      
      setDeletingDocument(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  // Handle document move
  const handleMoveDocument = async (folderId: string | null, primaryFolderId?: string) => {
    if (!movingDocument) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/documents/${movingDocument.id}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'admin-1',
          isAdmin: 'true',
          folderId: folderId,
          primaryFolderId: primaryFolderId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to move document');
      }

      // Reload documents
      if (searchQuery) {
        // If in search mode, re-run search
        search(searchQuery, selectedFolder !== 'all' ? { category: 'all' } : undefined);
      } else {
        // If browsing, reload all documents
        const result = await apiService.getDocuments(
          'admin-1',
          true,
          selectedFolder === 'all' ? undefined : selectedFolder,
          10,
          0,
          selectedPrimaryFolder?.id
        );
        setAllDocuments(result.documents);
      }

      // Reload folders to update document counts
      const userFolders = await folderService.getFolders('admin-1', true);
      setFolders(userFolders);
      
      setMovingDocument(null);
    } catch (error) {
      console.error('Failed to move document:', error);
      alert('Failed to move document. Please try again.');
    }
  };

  // Bulk operations handlers
  const handleSelectDocument = (documentId: string, selected: boolean) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allDocIds = transformedDocuments.map(doc => doc.id);
    setSelectedDocuments(new Set(allDocIds));
  };

  const handleClearSelection = () => {
    setSelectedDocuments(new Set());
  };

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedDocuments);
    
    try {
      // Delete each document
      for (const documentId of selectedIds) {
        const response = await fetch(`http://localhost:3001/api/documents/${documentId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'admin-1',
            isAdmin: 'true'
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to delete document ${documentId}`);
        }
      }

      // Refresh documents and folders
      const apiSearchService = new ApiSearchService();
      const result = await apiSearchService.getDocuments('admin-1', true, selectedFolder === 'all' ? undefined : selectedFolder, 50, 0, selectedPrimaryFolder?.id);
      setAllDocuments(result.documents);
      
      const userFolders = await folderService.getFolders('admin-1', true);
      setFolders(userFolders);
      
      // Clear selection and exit selection mode
      setSelectedDocuments(new Set());
      setIsSelectionMode(false);
      
      console.log(`✅ Successfully deleted ${selectedIds.length} documents`);
    } catch (error) {
      console.error('Failed to delete documents:', error);
      alert('Failed to delete some documents. Please try again.');
    }
  };

  const handleBulkMove = () => {
    setShowBulkMoveModal(true);
  };

  const executeBulkMove = async (folderId: string | null) => {
    const selectedIds = Array.from(selectedDocuments);
    
    try {
      // Move each document
      for (const documentId of selectedIds) {
        const response = await fetch(`http://localhost:3001/api/documents/${documentId}/move`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'admin-1',
            isAdmin: 'true',
            folderId: folderId
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to move document ${documentId}`);
        }
      }

      // Refresh documents and folders
      const apiSearchService = new ApiSearchService();
      const result = await apiSearchService.getDocuments('admin-1', true, selectedFolder === 'all' ? undefined : selectedFolder, 50, 0, selectedPrimaryFolder?.id);
      setAllDocuments(result.documents);
      
      const userFolders = await folderService.getFolders('admin-1', true);
      setFolders(userFolders);
      
      // Clear selection and exit selection mode
      setSelectedDocuments(new Set());
      setIsSelectionMode(false);
      setShowBulkMoveModal(false);
      
      console.log(`✅ Successfully moved ${selectedIds.length} documents`);
    } catch (error) {
      console.error('Failed to move documents:', error);
      alert('Failed to move some documents. Please try again.');
    }
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedDocuments(new Set());
  };

  // Enhanced upload handlers
  const handleGlobalFileDrop = (_files: File[]) => {
    setShowUpload(true);
    // Files will be handled by the EnhancedUploadZone
  };

  const handleUploadComplete = async () => {
    // Refresh documents, folders, and search results after upload
    try {
      setLoadingDocuments(true);
      
      // Always refresh folders first
      const userFolders = await folderService.getFolders('admin-1', true);
      setFolders(userFolders);
      
      // Refresh primary folders to update document counts
      const primaryFoldersData = await primaryFolderService.getPrimaryFolders('admin-1', true);
      setPrimaryFolders(primaryFoldersData);
      
      // If we're in search mode, re-run the search to include new documents
      if (searchQuery && searchQuery.trim()) {
        const filters = selectedFolder !== 'all' ? { category: 'all' as const } : undefined;
        await search(searchQuery, filters);
      } else {
        // Otherwise, refresh the browsing documents
        const apiSearchService = new ApiSearchService();
        const result = await apiSearchService.getDocuments(
          'admin-1', 
          true, 
          selectedFolder === 'all' ? undefined : selectedFolder, 
          50, 
          0, 
          selectedPrimaryFolder?.id
        );
        setAllDocuments(result.documents);
      }
      
      // If we have active tag filters, refresh the tag-filtered results
      if (activeTagFilter) {
        const tagService = await import('../services/tagService');
        const results = await tagService.tagService.searchByTags(activeTagFilter, 'admin-1');
        const documents = results
          .filter(result => result.item.type === 'document')
          .map(result => result.item);
        setTagFilteredDocuments(documents);
      }
      
      console.log('✅ Documents and folders refreshed after upload');
      
    } catch (error) {
      console.error('Failed to refresh after upload:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const dismissBackgroundUpload = (id: string) => {
    setBackgroundUploads(prev => prev.filter(upload => upload.id !== id));
  };

  // Transform documents based on search, tag filter, or browse mode
  const transformedDocuments = (() => {
    if (activeTagFilter && tagFilteredDocuments.length > 0) {
      // Show tag-filtered results
      return tagFilteredDocuments.map(doc => ({
        id: doc.id,
        title: doc.title || 'Untitled',
        category: doc.category || 'general',
        excerpt: doc.excerpt || doc.content?.slice(0, 200) + '...' || 'No preview available',
        uploadedBy: doc.uploadedBy || 'Unknown',
        uploadedAt: new Date(doc.uploadedAt || Date.now()),
        size: doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
        views: Math.floor(Math.random() * 500) + 50,
        starred: Math.random() > 0.7,
        score: 1.0,
        highlights: [],
        fileUrl: doc.fileUrl,
        fileType: doc.fileType,
        folderId: doc.folderId,
        folderName: doc.folderName
      }));
    } else if (searchQuery) {
      // Transform search results
      return searchResults.map(result => ({
        id: result.id,
        title: result.title || result.metadata?.originalName || 'Untitled',
        category: result.category || 'general',
        excerpt: result.excerpt || (result.content ? result.content.substring(0, 200) + '...' : 'No preview available'),
        uploadedBy: result.metadata?.author || 'Unknown',
        uploadedAt: new Date(result.metadata?.uploadedAt || Date.now()),
        size: result.metadata?.fileSize ? `${(result.metadata.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
        views: Math.floor(Math.random() * 500) + 50,
        starred: Math.random() > 0.7,
        score: result.score,
        highlights: result.highlights || [],
        fileUrl: `/uploads/${result.metadata?.originalName}`,
        fileType: result.fileType,
        folderId: result.metadata?.originalName, // Use originalName as folderId for now
        folderName: 'Search Results'
      }));
    } else {
      // Transform all documents
      return allDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
      excerpt: doc.excerpt,
      uploadedBy: doc.uploadedBy,
      uploadedAt: new Date(doc.uploadedAt),
      size: doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
      views: Math.floor(Math.random() * 500) + 50, // Mock views for now
      starred: Math.random() > 0.7, // Random starred status
      score: 1.0,
      highlights: [],
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      folderId: doc.folderId,
      folderName: doc.folderName
      }));
    }
  })();

  // Show initialization loading
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-white/70">Initializing search service...</p>
          <p className="text-sm text-white/50 mt-2">
            {serviceInfo.mode === 'demo' ? 'Loading demo data' : 'Connecting to AI services'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Service Status Banner */}
      {serviceInfo.mode === 'demo' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-dark rounded-xl p-4 border border-primary/20"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎭</div>
            <div>
              <h3 className="font-medium text-primary">Demo Mode Active</h3>
              <p className="text-sm text-white/70">
                Using realistic mock data. Add API keys in .env to enable production mode.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-dark rounded-xl p-4 border border-red-500/20 bg-red-500/5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-400" size={20} />
              <div>
                <h3 className="font-medium text-red-400">Service Error</h3>
                <p className="text-sm text-white/70">{error}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearError}>
              ×
            </Button>
          </div>
        </motion.div>
      )}

      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Breadcrumb Navigation - Mobile Friendly */}
        {currentView === 'folder-contents' && selectedPrimaryFolder && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToPrimaryFolders}
              className="flex items-center gap-2 text-primary hover:text-primary-light transition-colors text-sm bg-white/5 px-3 py-2 rounded-lg border border-white/10"
            >
              <ArrowLeft size={14} />
              <span className="hidden xs:inline">Home</span>
              <span className="xs:hidden">Home</span>
            </button>
            <div className="flex items-center gap-2 text-sm overflow-hidden">
              <span className="text-white/30">/</span>
              <span className="text-white/70 truncate">{selectedPrimaryFolder.name}</span>
              {selectedFolder !== 'all' && (
                <>
                  <span className="text-white/30 hidden sm:inline">/</span>
                  <span className="text-white/50 truncate hidden sm:inline">
                    {folders.find(f => f.id === selectedFolder)?.name || 'Unknown Folder'}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Title and Description */}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 truncate">
            {currentView === 'primary-folders' 
              ? 'Knowledge Base' 
              : selectedPrimaryFolder?.name || 'Knowledge Base'
            }
          </h1>
          <p className="text-white/70 text-sm sm:text-base leading-relaxed">
            {currentView === 'primary-folders'
              ? 'Organize and search your travel documents by category'
              : selectedPrimaryFolder?.description || 'Search and manage your travel documents'
            }
            {isInitialized && (
              <span className="ml-2 text-xs text-primary">
                • {serviceInfo.mode} mode
              </span>
            )}
          </p>
        </div>
        
        {/* Action Buttons - Mobile Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:w-auto gap-3">
          {currentView === 'folder-contents' && (
            <>
              <Button 
                variant="ghost" 
                onClick={() => {
                  console.log('Create Folder button clicked');
                  setShowCreateFolder(true);
                }}
                className="flex items-center gap-2 justify-center py-3 sm:py-2"
                disabled={!isInitialized || (!selectedPrimaryFolder && currentView === 'folder-contents')}
              >
                <FolderPlus size={18} />
                <span className="text-sm sm:text-base">Create Folder</span>
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 justify-center glow-on-hover brightness-110 py-3 sm:py-2"
                disabled={!isInitialized}
              >
                <Upload size={18} />
                <span className="text-sm sm:text-base">Upload Document</span>
              </Button>
            </>
          )}
          
          {currentView === 'primary-folders' && (
            <Button 
              variant="ghost"
              onClick={() => setShowCreatePrimaryFolder(true)}
              className="flex items-center gap-2 justify-center py-3 sm:py-2"
              disabled={!isInitialized}
            >
              <Plus size={18} />
              <span className="text-sm sm:text-base">Create Category</span>
            </Button>
          )}
          
          {/* Tag Manager Button - Available in all views */}
          <Button 
            variant="glass"
            onClick={() => setShowTagManager(true)}
            className="flex items-center gap-2 justify-center py-3 sm:py-2"
            disabled={!isInitialized}
          >
            <Hash size={18} />
            <span className="text-sm sm:text-base hidden sm:inline">Tag Manager</span>
            <span className="text-sm sm:text-base sm:hidden">Tags</span>
          </Button>
          
          {currentView === 'primary-folders' && (
            <>
              <Button 
                variant="glass" 
                onClick={() => setCurrentView('folder-contents')}
                className="flex items-center gap-2 justify-center py-3 sm:py-2"
                disabled={!isInitialized}
              >
                <Folder size={18} />
                <span className="text-sm sm:text-base">Browse All Documents</span>
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 justify-center glow-on-hover brightness-110 py-3 sm:py-2"
                disabled={!isInitialized}
              >
                <Upload size={18} />
                <span className="text-sm sm:text-base">Upload Document</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content - Conditional Rendering */}
      {currentView === 'primary-folders' ? (
        /* Primary Folders View */
        <div className="space-y-8">
          {/* Primary Folders Loading */}
          {loadingPrimaryFolders ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-white/70">Loading categories...</p>
              </div>
            </div>
          ) : (
            /* Primary Folders Grid - Mobile Optimized */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {primaryFolders.map((primaryFolder) => (
                <PrimaryFolderCard
                  key={primaryFolder.id}
                  primaryFolder={primaryFolder}
                  isAdmin={true}
                  onClick={() => handlePrimaryFolderSelect(primaryFolder)}
                  onEdit={(folder) => setEditingPrimaryFolder(folder)}
                  onDelete={(folder) => setDeletingPrimaryFolder(folder)}
                  className="h-full"
                />
              ))}
            </div>
          )}
          
          {/* Empty State for Primary Folders */}
          {!loadingPrimaryFolders && primaryFolders.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🗂️</div>
              <h3 className="text-xl font-semibold mb-2">No Categories Available</h3>
              <p className="text-white/60 mb-6">
                Contact your administrator to set up knowledge base categories.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Folder Contents View */
        <div className="space-y-6">
          {/* Quick Comprehensive Search */}
          <div className="w-full">
            <QuickSearchShortcut 
              onOpenSearch={() => setShowComprehensiveSearch(true)}
              placeholder="Search the Knowledge Base... (⌘K)"
            />
          </div>


          {/* Search Results Summary */}
          {searchQuery && (
            <SearchResultsSummary
              query={searchQuery}
              totalResults={totalResults}
              processingTime={processingTime}
              currentFolder={selectedFolder === 'all' ? null : folders.find(f => f.id === selectedFolder)}
              onClearSearch={() => {
                setSearchQuery('');
                clearResults();
              }}
            />
          )}

          {/* Folder Tree Navigation */}
          <div className="space-y-4">
            <button
              onClick={() => setIsFolderStructureExpanded(!isFolderStructureExpanded)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all touch-manipulation"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isFolderStructureExpanded ? (
                  <ChevronDown size={14} className="text-white/70 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-white/70 shrink-0" />
                )}
                <h3 className="text-xs sm:text-sm font-medium text-white/60 truncate">Knowledge Base Structure</h3>
                <span className="text-xs text-white/40 bg-white/10 px-2 py-1 rounded-full shrink-0">
                  {primaryFolders.length}
                  <span className="hidden sm:inline"> categories</span>
                </span>
              </div>
              {processingTime > 0 && (
                <span className="text-xs text-white/50 hidden md:inline">
                  Search completed in {processingTime}ms
                </span>
              )}
            </button>
            
            <AnimatePresence>
              {isFolderStructureExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden space-y-4"
                >
                  {/* All Documents Quick Access - Only show when not in a specific primary folder */}
                  {!selectedPrimaryFolder && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFolderChange('all')}
                      disabled={!isInitialized}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl transition-all touch-manipulation',
                        'border border-white/10 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed',
                        selectedFolder === 'all' 
                          ? 'bg-primary/20 border-primary shadow-lg shadow-primary/25' 
                          : 'bg-white/5 hover:bg-white/10'
                      )}
                    >
                      <span className="text-base sm:text-lg">📄</span>
                      <span className="font-medium text-xs sm:text-sm">All Documents</span>
                      <span className="text-xs text-white/60 ml-auto">
                        ({searchQuery ? `${transformedDocuments.length}` : `${allDocuments.length}`})
                      </span>
                    </motion.button>
                  )}

                  {/* Folder Tree */}
                  {loadingFolders || loadingPrimaryFolders ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2 text-white/50">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Loading folder structure...</span>
                      </div>
                    </div>
                  ) : (
                    <FolderTree
                      primaryFolders={primaryFolders}
                      folders={folders}
                      selectedFolderId={selectedFolder === 'all' ? undefined : selectedFolder}
                      selectedPrimaryFolderId={selectedPrimaryFolder?.id}
                      onFolderSelect={(folderId, type) => {
                        if (type === 'primary') {
                          const primaryFolder = primaryFolders.find(pf => pf.id === folderId);
                          if (primaryFolder) {
                            handlePrimaryFolderSelect(primaryFolder);
                          }
                        } else {
                          handleFolderChange(folderId);
                        }
                      }}
                      onCreateSubfolder={(parentId, type) => {
                        if (type === 'primary') {
                          // Creating a subfolder under a primary folder
                          const primaryFolder = primaryFolders.find(pf => pf.id === parentId);
                          if (primaryFolder) {
                            setSelectedPrimaryFolder(primaryFolder);
                            setCurrentView('folder-contents');
                          }
                        }
                        setShowCreateFolder(true);
                      }}
                      onEditFolder={setEditingFolder}
                      onDeleteFolder={setDeletingFolder}
                      onMoveFolder={handleMoveFolder}
                      canCreateFolders={selectedPrimaryFolder?.permissions.canCreate}
                      enableDragDrop={true}
                      className="bg-white/5 rounded-xl p-4 border border-white/10"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

      {/* Toolbar - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Status and Filter - Mobile Stack */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <TagFilter 
            onFilterChange={handleTagFilterChange}
            className="shrink-0"
            showClearButton={true}
          />
          <span className="text-xs sm:text-sm text-white/60 truncate">
            {isSearching || loadingDocuments ? (
              <span className="flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" />
                <span className="hidden xs:inline">{isSearching ? 'Searching...' : 'Loading...'}</span>
              </span>
            ) : activeTagFilter ? (
              <span className="truncate">
                <span className="hidden sm:inline">Found </span>
                {transformedDocuments.length} 
                <span className="hidden sm:inline"> items</span>
                <span className="hidden md:inline"> by tags</span>
              </span>
            ) : searchQuery ? (
              <span className="truncate">
                <span className="hidden sm:inline">Found </span>
                {transformedDocuments.length} 
                <span className="hidden sm:inline"> results</span>
                <span className="hidden md:inline"> for "{searchQuery}"</span>
                <span className="hidden lg:inline">{selectedPrimaryFolder ? ` in ${selectedPrimaryFolder.name}` : ''}</span>
              </span>
            ) : (
              <span className="truncate">
                <span className="hidden sm:inline">Showing </span>
                {transformedDocuments.length} 
                <span className="hidden sm:inline"> documents</span>
                <span className="hidden lg:inline">{selectedPrimaryFolder ? ` in ${selectedPrimaryFolder.name}` : ''}</span>
              </span>
            )}
          </span>
        </div>
        
        {/* View Controls - Mobile Responsive */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Selection Mode Toggle */}
          {transformedDocuments.length > 0 && !isSelectionMode && (
            <Button
              variant="glass"
              size="sm"
              className="px-2 sm:px-3 py-2"
              onClick={() => setIsSelectionMode(true)}
            >
              <span className="text-xs sm:text-sm">Select</span>
            </Button>
          )}
          
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'glass'}
            size="sm"
            className="px-2 sm:px-3 py-2"
            onClick={() => setViewMode('grid')}
          >
            <Grid size={16} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'glass'}
            size="sm"
            className="px-2 sm:px-3 py-2"
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {isSelectionMode && (
        <BulkActionsToolbar
          selectedCount={selectedDocuments.size}
          totalCount={transformedDocuments.length}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkMove={handleBulkMove}
          onExitSelectionMode={handleExitSelectionMode}
        />
      )}

      {/* Documents Grid/List */}
      {isSearching || loadingDocuments ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-white/70">
              {isSearching ? 'Searching knowledge base...' : 'Loading documents...'}
            </p>
          </div>
        </div>
      ) : transformedDocuments.length > 0 ? (
        <motion.div
          layout
          className={cn(
            'grid gap-4 sm:gap-6',
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          )}
        >
          {transformedDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <SelectableDocumentCard 
                document={doc} 
                viewMode={viewMode}
                isSelected={selectedDocuments.has(doc.id)}
                isSelectionMode={isSelectionMode}
                onSelect={handleSelectDocument} 
                onClick={(document) => {
                  if (searchQuery) {
                    // For search results, get the full content
                    const fullResult = searchResults.find(r => r.id === document.id);
                    
                    console.log('Knowledge.tsx Debug:', {
                      document: document,
                      fullResult: fullResult,
                      fileUrl: fullResult?.metadata?.originalName,
                      fileType: fullResult?.fileType
                    });
                    
                    setSelectedDocument({
                      ...document,
                      content: fullResult?.content || document.excerpt,
                      uploadedBy: document.uploadedBy || 'Unknown',
                      uploadedAt: document.uploadedAt || new Date(),
                      size: document.size || 'Unknown',
                      fileUrl: (document as any).fileUrl || `/uploads/${document.title}`,
                      fileType: (document as any).fileType || 'application/pdf'
                    });
                  } else {
                    // For browsing mode, use document directly
                    setSelectedDocument({
                      ...document,
                      content: document.excerpt,
                      uploadedBy: document.uploadedBy || 'Unknown',
                      uploadedAt: document.uploadedAt || new Date(),
                      size: document.size || 'Unknown'
                    });
                  }
                  setShowDocumentViewer(true);
                }}
                onDelete={(documentId) => {
                  const document = transformedDocuments.find(d => d.id === documentId);
                  if (document) {
                    setDeletingDocument({ id: documentId, title: document.title });
                  }
                }}
                onMove={(documentId) => {
                  const document = transformedDocuments.find(d => d.id === documentId);
                  if (document) {
                    setMovingDocument({ 
                      id: documentId, 
                      title: document.title, 
                      folderId: document.folderId 
                    });
                  }
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : selectedPrimaryFolder && selectedFolder === 'all' && !searchQuery ? (
        /* Show sub-folders when primary folder is selected but no specific sub-folder */
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">{selectedPrimaryFolder.name === 'Destinations' ? '🌍' : selectedPrimaryFolder.name === 'Suppliers' ? '🏢' : selectedPrimaryFolder.name === 'Policies & Regulations' ? '📋' : selectedPrimaryFolder.name === 'Marketing Materials' ? '📊' : '📁'}</div>
            <h3 className="text-xl font-semibold mb-2">{selectedPrimaryFolder.name}</h3>
            <p className="text-white/60 mb-6">
              Select a folder below to view documents, or create a new folder to organize your content.
            </p>
          </div>
          
          {/* Sub-folders Grid */}
          {loadingFolders ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-white/70">Loading folders...</p>
              </div>
            </div>
          ) : folders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {folders.map((folder) => (
                <motion.button
                  key={folder.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleFolderChange(folder.id)}
                  className="p-4 sm:p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left group touch-manipulation"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Folder size={20} className="text-primary group-hover:text-primary-light sm:w-6 sm:h-6" />
                    <h4 className="font-medium text-white group-hover:text-white text-sm sm:text-base truncate">{folder.name}</h4>
                  </div>
                  {folder.description && (
                    <p className="text-sm text-white/60 mb-3 line-clamp-2">{folder.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{folder.documentCount || 0} documents</span>
                    <span>Updated {new Date((folder as any).updatedAt || (folder as any).createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📂</div>
              <h4 className="text-lg font-medium mb-2">No Folders Yet</h4>
              <p className="text-white/60 mb-4">Create your first folder to organize documents in {selectedPrimaryFolder.name}.</p>
              <Button 
                variant="primary" 
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center gap-2"
                disabled={!selectedPrimaryFolder?.permissions.canCreate}
              >
                <FolderPlus size={18} />
                Create Folder
              </Button>
            </div>
          )}
        </div>
      ) : !searchQuery && transformedDocuments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold mb-2">Empty Folder</h3>
          <p className="text-white/60">
            This folder doesn't contain any documents yet. Use the upload button above to add documents.
          </p>
        </div>
      ) : searchQuery && searchResults.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
          <p className="text-white/60 mb-6">
            Try adjusting your search terms or selecting a different category.
          </p>
          <Button variant="glass" onClick={clearResults}>
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2">Start Searching</h3>
          <p className="text-white/60 mb-6">
            Use the search bar above to find travel documents, visa requirements, airline policies, and more.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Japan visa', 'baggage policy', 'travel insurance', 'passport renewal'].map(suggestion => (
              <Button
                key={suggestion}
                variant="glass"
                size="sm"
                onClick={() => handleSearch(suggestion)}
                className="text-sm"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}
        </div>
      )}

      {/* Enhanced Upload Modal */}
      {showUpload && (
        <EnhancedUploadZone 
          onClose={() => setShowUpload(false)}
          onUploadComplete={handleUploadComplete}
          onFileUploaded={handleUploadComplete} // Refresh immediately after each file
          folders={folders}
          primaryFolderId={selectedPrimaryFolder?.id}
        />
      )}

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreateFolder={handleCreateFolder}
      />

      {/* Document Viewer Modal */}
      <DocumentViewer
        isOpen={showDocumentViewer}
        onClose={() => {
          setShowDocumentViewer(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        currentPrimaryFolder={selectedPrimaryFolder?.name}
        currentSubFolder={selectedFolder !== 'all' ? folders.find(f => f.id === selectedFolder)?.name : undefined}
        onNavigateToCategories={handleBackToPrimaryFolders}
        onNavigateToPrimaryFolder={() => {
          setSelectedFolder('all');
          // Stay in current primary folder but go to folder view
        }}
      />

      {/* Edit Folder Modal */}
      {editingFolder && (
        <EditFolderModal
          isOpen={!!editingFolder}
          onClose={() => setEditingFolder(null)}
          onEditFolder={handleEditFolder}
          currentName={editingFolder.name}
          currentDescription={editingFolder.description}
        />
      )}

      {/* Delete Folder Modal */}
      {deletingFolder && (
        <DeleteFolderModal
          isOpen={!!deletingFolder}
          onClose={() => setDeletingFolder(null)}
          onDeleteFolder={handleDeleteFolder}
          folderName={deletingFolder.name}
          documentCount={deletingFolder.documentCount}
        />
      )}

      {/* Delete Document Modal */}
      {deletingDocument && (
        <DeleteDocumentModal
          isOpen={!!deletingDocument}
          onClose={() => setDeletingDocument(null)}
          onDeleteDocument={handleDeleteDocument}
          documentTitle={deletingDocument.title}
        />
      )}

      {/* Move Document Modal */}
      {movingDocument && (
        <MoveDocumentModal
          isOpen={!!movingDocument}
          onClose={() => setMovingDocument(null)}
          onMoveDocument={handleMoveDocument}
          documentTitle={movingDocument.title}
          currentFolderId={movingDocument.folderId}
          currentPrimaryFolderId={selectedPrimaryFolder?.id}
          folders={folders}
          primaryFolders={primaryFolders}
        />
      )}

      {/* Bulk Move Modal */}
      <BulkMoveModal
        isOpen={showBulkMoveModal}
        onClose={() => setShowBulkMoveModal(false)}
        folders={folders}
        selectedDocuments={Array.from(selectedDocuments).map(id => {
          const doc = transformedDocuments.find(d => d.id === id);
          return {
            id,
            title: doc?.title || 'Unknown',
            folderId: doc?.folderId
          };
        })}
        onMove={executeBulkMove}
      />

      {/* Global Drag & Drop Overlay */}
      <GlobalDragDropOverlay
        onFilesDropped={handleGlobalFileDrop}
        isEnabled={isInitialized && !showUpload}
      />

      {/* Floating Upload Progress */}
      <FloatingUploadProgress
        uploads={backgroundUploads}
        isVisible={backgroundUploads.length > 0}
        onDismiss={dismissBackgroundUpload}
      />

      {/* Primary Folder Admin Modals */}
      <CreatePrimaryFolderModal
        isOpen={showCreatePrimaryFolder}
        onClose={() => setShowCreatePrimaryFolder(false)}
        onCreatePrimaryFolder={handleCreatePrimaryFolder}
      />

      {editingPrimaryFolder && (
        <EditPrimaryFolderModal
          isOpen={!!editingPrimaryFolder}
          onClose={() => setEditingPrimaryFolder(null)}
          onEditPrimaryFolder={handleEditPrimaryFolder}
          primaryFolder={editingPrimaryFolder}
        />
      )}

      {deletingPrimaryFolder && (
        <DeletePrimaryFolderModal
          isOpen={!!deletingPrimaryFolder}
          onClose={() => setDeletingPrimaryFolder(null)}
          onDeletePrimaryFolder={handleDeletePrimaryFolder}
          primaryFolder={deletingPrimaryFolder}
        />
      )}

      {/* Comprehensive Search Modal */}
      <ComprehensiveSearchInterface
        isOpen={showComprehensiveSearch}
        onClose={() => setShowComprehensiveSearch(false)}
        primaryFolders={primaryFolders}
        onResultSelect={(result) => {
          if (result.type === 'document') {
            // Handle document selection
            setSelectedDocument({
              id: result.id,
              title: result.title,
              content: result.content || result.description || '',
              category: result.metadata.category || 'general',
              uploadedBy: 'Unknown',
              uploadedAt: result.metadata.uploadedAt || new Date(),
              size: result.metadata.size || '0 KB',
              fileUrl: '',
              fileType: result.metadata.fileType || ''
            });
            setShowDocumentViewer(true);
          }
        }}
        onFolderNavigate={(folderId, type) => {
          if (type === 'primary') {
            const primaryFolder = primaryFolders.find(pf => pf.id === folderId);
            if (primaryFolder) {
              handlePrimaryFolderSelect(primaryFolder);
            }
          } else {
            handleFolderChange(folderId);
          }
        }}
      />

      {/* Tag Manager Modal */}
      <TagManager
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        onTagUpdate={() => {
          // Refresh data when tags are updated
          if (activeTagFilter) {
            handleTagFilterChange(activeTagFilter);
          }
        }}
      />
    </div>
  );
};