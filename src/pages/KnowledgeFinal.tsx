import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, Upload, Plus, Loader2, FolderPlus, X, Menu } from 'lucide-react';
import FolderTreeRecursive from '../components/knowledge/FolderTreeRecursive';
import SearchBar from '../components/knowledge/SearchBar';
import DocList from '../components/knowledge/DocList';
import DocPreviewEnhanced from '../components/knowledge/DocPreviewEnhanced';
import { DocumentUploadModal } from '../components/knowledge/DocumentUploadModal';
import type { Doc, FolderNode } from '../types/knowledge';
import type { Folder as FolderType } from '../services/folderService';
import type { PrimaryFolder } from '../types/primaryFolder';
import { primaryFolderService } from '../services/primaryFolderService';
import { folderService } from '../services/folderService';
import { ApiSearchService } from '../services/apiSearchService';
import { useSearchService } from '../hooks/useSearchService';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../components/shared/Skeleton';
import Spinner from '../components/shared/Spinner';
import InlineNotice from '../components/shared/InlineNotice';
import { useToast } from '../components/toast/ToastProvider';
import { normalizeError } from '../lib/errors';
import { useIsMobile } from '../hooks/useBreakpoint';
import Drawer from '../components/shared/Drawer';
import { useTour } from '../components/tour/TourProvider';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card, CardContent } from '../components/ui/Card';

// Convert API document to our Doc type
const convertToDoc = (apiDoc: any): Doc => {
  const getDocType = (fileType: string): Doc['type'] => {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('xlsx')) return 'Spreadsheet';
    if (type.includes('presentation') || type.includes('powerpoint') || type.includes('pptx')) return 'Presentation';
    if (type.includes('markdown') || type.includes('md')) return 'Markdown';
    return 'Document';
  };

  const getRelativeTime = (date: Date | string): string => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return `${weeks}w ago`;
  };

  // Extract preview URL if available - check all possible URL fields
  let previewUrl = apiDoc.previewUrl;
  if (!previewUrl && apiDoc.url) {
    previewUrl = apiDoc.url;
  }
  if (!previewUrl && apiDoc.signedUrl) {
    previewUrl = apiDoc.signedUrl;
  }
  if (!previewUrl && apiDoc.fileUrl) {
    previewUrl = apiDoc.fileUrl;
  }

  return {
    id: apiDoc.id,
    title: apiDoc.title || apiDoc.metadata?.originalName || 'Untitled',
    folderId: apiDoc.folderId || apiDoc.primaryFolderId || '',
    folder: apiDoc.folderId || apiDoc.primaryFolderId || '', // backwards compatibility
    type: getDocType(apiDoc.fileType),
    updated: getRelativeTime(apiDoc.uploadedAt || apiDoc.metadata?.uploadedAt || new Date()),
    previewUrl: previewUrl,
    content: apiDoc.content,
    metadata: apiDoc.metadata
  };
};

// Helper to get all descendant folder IDs
function getDescendantIds(node: FolderNode): string[] {
  const ids: string[] = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...getDescendantIds(child));
    }
  }
  return ids;
}

export const KnowledgeFinal = () => {
  const navigate = useNavigate();
  const apiService = new ApiSearchService();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  
  // Data state
  const [primaryFolders, setPrimaryFolders] = useState<PrimaryFolder[]>([]);
  const [subfolders, setSubfolders] = useState<FolderType[]>([]);
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  
  // Error states
  const [qdrantIssue, setQdrantIssue] = useState<null | { title: string; message: string; docsHref?: string }>(null);
  const { push: pushToast } = useToast();
  
  // Mobile state
  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Tour
  const { start: startTour } = useTour();
  
  // Search service
  const {
    isSearching,
    isInitialized,
    search: performSearch,
    clearResults
  } = useSearchService();

  // Load primary folders on mount
  useEffect(() => {
    const loadPrimaryFolders = async () => {
      setLoading(true);
      try {
        const data = await primaryFolderService.getPrimaryFolders('admin-1', true);
        setPrimaryFolders(data);
      } catch (error) {
        console.error('Failed to load primary folders:', error);
        setPrimaryFolders([]);
      } finally {
        setLoading(false);
      }
    };

    if (isInitialized) {
      loadPrimaryFolders();
    }
  }, [isInitialized]);

  // Load all subfolders
  useEffect(() => {
    const loadAllSubfolders = async () => {
      if (!isInitialized) return;
      
      try {
        const allFolders = await folderService.getFolders('admin-1', true);
        setSubfolders(allFolders);
      } catch (error) {
        console.error('Failed to load subfolders:', error);
        setSubfolders([]);
      }
    };

    loadAllSubfolders();
  }, [isInitialized]);

  // Load all documents
  useEffect(() => {
    const loadAllDocuments = async () => {
      if (!isInitialized) return;
      
      setLoadingDocuments(true);
      try {
        // Load documents from all folders
        const result = await apiService.getDocuments(
          'admin-1',
          true,
          undefined, // no specific folder filter
          200, // Get more documents
          0,
          undefined // no primary folder filter
        );
        
        setAllDocuments(result.documents);
      } catch (error) {
        console.error('Failed to load documents:', error);
        setAllDocuments([]);
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadAllDocuments();
  }, [isInitialized]);

  // Check Qdrant health on mount (disabled for now as the endpoint doesn't exist)
  useEffect(() => {
    const checkQdrantHealth = async () => {
      try {
        // Only check if we know there's a health endpoint
        // For now, we'll skip this check since the /search/health endpoint doesn't exist
        // Uncomment when the backend implements this endpoint
        
        /*
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${baseUrl}/search/health`);
        
        if (!response.ok && response.status !== 404) {
          // Only treat as error if it's not a 404 (endpoint not found)
          const errorData = await response.json().catch(() => null);
          if (errorData && errorData.code === 'QDRANT_MISSING_COLLECTIONS') {
            const normalizedError = normalizeError(errorData);
            
            // Set persistent error
            setQdrantIssue({
              title: normalizedError.title,
              message: normalizedError.message,
              docsHref: normalizedError.docsHref
            });
            
            // Also show a toast warning
            pushToast({
              kind: 'warning',
              title: normalizedError.title,
              message: 'Search functionality will be limited until this is resolved.'
            });
          }
        }
        */
      } catch (err) {
        // Only log, don't show user-facing errors for health check failures
        console.debug('Qdrant health check skipped:', err);
      }
    };

    if (isInitialized) {
      checkQdrantHealth();
    }
  }, [isInitialized, pushToast]);

  // Build nested folder tree structure
  const folderTree = useMemo((): FolderNode[] => {
    const tree: FolderNode[] = [];
    const nodeMap = new Map<string, FolderNode>();
    
    // Build tree structure handling legacy ID mismatches
    
    // Create mapping of old IDs to new primary folders based on common patterns
    // These are the old IDs that subfolders reference
    const oldToNewIdMap: Record<string, string> = {
      '37b2dff2-fa91-46c7-bd30-c28715178bf0': '', // Old Destinations ID
      'bf380526-3fd8-41b0-bd63-a85a60ccc2ad': '', // Old Suppliers ID
    };
    
    // Try to map old IDs to new ones based on folder names
    primaryFolders.forEach(pf => {
      if (pf.name === 'Destinations' || pf.slug === 'destinations') {
        oldToNewIdMap['37b2dff2-fa91-46c7-bd30-c28715178bf0'] = pf.id;
      } else if (pf.name === 'Suppliers' || pf.slug === 'suppliers') {
        oldToNewIdMap['bf380526-3fd8-41b0-bd63-a85a60ccc2ad'] = pf.id;
      }
    });
    
    // First, create nodes for all primary folders
    primaryFolders.forEach(pf => {
      const node: FolderNode = {
        id: pf.id,
        name: pf.name,
        parentId: null,
        children: [],
        documentCount: 0
      };
      nodeMap.set(pf.id, node);
      tree.push(node);
    });
    
    // Then, create nodes for all subfolders
    subfolders.forEach(sf => {
      // Skip folders without primaryFolderId  
      if (!sf.primaryFolderId) {
        // Skip folders without primaryFolderId
        return;
      }
      
      // Determine the actual parent - could be a primary folder or another subfolder
      const actualParentId = sf.parentId || sf.primaryFolderId;
      
      const node: FolderNode = {
        id: sf.id,
        name: sf.name,
        parentId: actualParentId,
        children: [],
        documentCount: sf.documentCount || 0
      };
      nodeMap.set(sf.id, node);
    });
    
    // Now attach subfolders to their parents (could be primary folders or other subfolders)
    subfolders.forEach(sf => {
      if (!sf.primaryFolderId) return;
      
      const node = nodeMap.get(sf.id);
      if (!node) return;
      
      const actualParentId = sf.parentId || sf.primaryFolderId;
      
      // Try to find parent - first by direct ID, then by mapped ID
      let parent = nodeMap.get(actualParentId);
      if (!parent && oldToNewIdMap[actualParentId]) {
        parent = nodeMap.get(oldToNewIdMap[actualParentId]);
        if (parent) {
          // Update the node's parentId to the new ID
          node.parentId = oldToNewIdMap[actualParentId];
        }
      }
      
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        // Try to match by name as fallback
        const destinationNames = ['france', 'italy', 'spain', 'japan', 'australia', 'greece', 'portugal', 'england', 'iceland'];
        const supplierNames = ['airlines', 'hotels', 'car rentals'];
        const folderNameLower = sf.name.toLowerCase();
        
        if (destinationNames.some(name => folderNameLower.includes(name))) {
          const destFolder = tree.find(f => f.name === 'Destinations');
          if (destFolder) {
            if (!destFolder.children) destFolder.children = [];
            destFolder.children.push(node);
            node.parentId = destFolder.id;
          }
        } else if (supplierNames.some(name => folderNameLower.includes(name))) {
          const suppFolder = tree.find(f => f.name === 'Suppliers');
          if (suppFolder) {
            if (!suppFolder.children) suppFolder.children = [];
            suppFolder.children.push(node);
            node.parentId = suppFolder.id;
          }
        }
        // Subfolder couldn't be matched to any primary folder
      }
    });
    
    // Count documents for each folder
    allDocuments.forEach(doc => {
      if (doc.folderId) {
        const folder = nodeMap.get(doc.folderId);
        if (folder) {
          folder.documentCount = (folder.documentCount || 0) + 1;
        }
      }
      if (doc.primaryFolderId) {
        const folder = nodeMap.get(doc.primaryFolderId);
        if (folder && !doc.folderId) {
          // Only count direct documents in primary folder
          folder.documentCount = (folder.documentCount || 0) + 1;
        }
      }
    });
    
    // Return the built tree
    
    return tree;
  }, [primaryFolders, subfolders, allDocuments]);

  // Filter documents by folder and search query
  const visibleDocuments = useMemo(() => {
    let docs = allDocuments;
    
    // Filter by folder
    if (activeFolderId) {
      // Find the specific node in the tree
      const findNode = (nodes: FolderNode[], id: string): FolderNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      
      const targetNode = findNode(folderTree, activeFolderId);
      if (targetNode) {
        const validIds = getDescendantIds(targetNode);
        
        // Build comprehensive ID mappings
        const folderIdMap: Record<string, string> = {
          // Map folder IDs to their names for intelligent matching
          '76cb0d0a-adac-46da-8eda-4b679726f101': 'Destinations', // Legacy Destinations container
          '11cd5be6-cb24-49df-95d5-551330e3b7db': 'Iceland',
          'england-001': 'England',
          'portugal-001': 'Portugal',
          'greece-001': 'Greece',
          'spain-001': 'Spain',
          'france-001': 'France',
          'italy-001': 'Italy',
          'japan-001': 'Japan',
          'australia-001': 'Australia',
          'dffeff1b-dbac-40c0-9eaa-a31f535447c0': 'France',
          '830b5de3-5f1f-46e2-8087-2e5a7e9bb41d': 'Portugal' // Another Portugal ID
        };
        
        // Special handling for Greece folder
        const greeceFolderId = 'greece-001';
        const spainFolderId = 'spain-001';
        
        const filteredDocs = docs.filter(doc => {
          const docTitle = (doc.title || doc.metadata?.originalName || '').toLowerCase();
          
          // Direct folder ID match
          if (doc.folderId && validIds.includes(doc.folderId)) {
            return true;
          }
          
          // Special case: documents in the legacy "Destinations" folder (76cb0d0a...)
          // These should be redistributed to their proper subfolders
          if (doc.folderId === '76cb0d0a-adac-46da-8eda-4b679726f101') {
            // Check if we're viewing Destinations primary folder - show all
            if (targetNode.parentId === null && targetNode.name === 'Destinations') {
              return true;
            }
            // Otherwise, match by document name to subfolder
            if (docTitle.includes('greece') && validIds.includes(greeceFolderId)) {
              return true;
            }
            if (docTitle.includes('spain') && validIds.includes(spainFolderId)) {
              return true;
            }
            // Add more mappings as needed
            return false;
          }
          
          // Documents with no folder but matching name
          if (!doc.folderId && targetNode.name !== 'Destinations') {
            const folderNameLower = targetNode.name.toLowerCase();
            if (docTitle.includes(folderNameLower)) {
              return true;
            }
          }
          
          // Primary folder ID matching with legacy support
          if (doc.primaryFolderId) {
            // Old Destinations primary folder ID
            if (doc.primaryFolderId === '37b2dff2-fa91-46c7-bd30-c28715178bf0') {
              // If viewing Destinations primary folder or any of its children
              const destFolder = folderTree.find(f => f.name === 'Destinations');
              if (destFolder && validIds.includes(destFolder.id)) {
                return true;
              }
            }
          }
          
          // For documents without proper folder assignment, try name matching
          if (!doc.folderId && targetNode.parentId === null && targetNode.name === 'Destinations') {
            // Show all travel destination docs in Destinations primary folder
            const destinationKeywords = ['england', 'france', 'spain', 'greece', 'portugal', 'italy', 'iceland', 'japan', 'australia'];
            if (destinationKeywords.some(keyword => docTitle.includes(keyword))) {
              return true;
            }
          }
          
          return false;
        });
        
        docs = filteredDocs;
      }
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      docs = docs.filter(doc => {
        const title = (doc.title || doc.metadata?.originalName || '').toLowerCase();
        const content = (doc.content || '').toLowerCase();
        return title.includes(query) || content.includes(query);
      });
    }
    
    // Convert to Doc type
    return docs.map(doc => convertToDoc(doc));
  }, [allDocuments, activeFolderId, searchQuery, folderTree]);

  // Get active document
  const activeDoc = visibleDocuments.find(d => d.id === activeDocId) || null;

  // Handle folder selection
  const handleFolderSelect = (folderId: string | null) => {
    setActiveFolderId(folderId);
    // Don't clear search to allow combined filtering
  };

  // Handle create subfolder
  const handleCreateSubfolder = async (parentId: string) => {
    setCreateFolderParentId(parentId);
    setShowCreateFolderModal(true);
  };

  // Actually create the subfolder
  const createSubfolder = async (name: string) => {
    if (!createFolderParentId || !name.trim()) {
      console.log('❌ Cannot create subfolder: missing parent ID or name', { createFolderParentId, name });
      pushToast({
        kind: 'error',
        title: 'Cannot create subfolder',
        message: 'Missing parent folder or folder name'
      });
      return;
    }
    
    try {
      console.log('📁 Creating subfolder:', { name, parentId: createFolderParentId });
      
      // Check if parent is a primary folder or subfolder
      const isPrimary = primaryFolders.some(f => f.id === createFolderParentId);
      console.log('🔍 Parent folder type:', isPrimary ? 'PRIMARY' : 'SUBFOLDER');
      
      if (isPrimary) {
        // Create subfolder under primary folder
        console.log('📁 Creating under primary folder:', createFolderParentId);
        const newFolder = await folderService.createFolder('admin-1', {
          name: name.trim(),
          description: '',
          primaryFolderId: createFolderParentId,
          userId: 'admin-1',
          isAdmin: true
        });
        
        console.log('✅ Subfolder created successfully:', newFolder);
        
        // Update local state
        setSubfolders(prev => [...prev, newFolder]);
        
        pushToast({
          kind: 'success',
          title: 'Subfolder created',
          message: `"${name}" has been created successfully`
        });
      } else {
        // For nested subfolders, find the primary folder
        const parentSubfolder = subfolders.find(f => f.id === createFolderParentId);
        console.log('🔍 Found parent subfolder:', parentSubfolder);
        
        if (parentSubfolder) {
          console.log('📁 Creating nested subfolder under:', parentSubfolder.name);
          const newFolder = await folderService.createFolder('admin-1', {
            name: name.trim(),
            description: '',
            primaryFolderId: parentSubfolder.primaryFolderId,
            parentId: createFolderParentId,
            userId: 'admin-1',
            isAdmin: true
          });
          
          console.log('✅ Nested subfolder created successfully:', newFolder);
          
          setSubfolders(prev => [...prev, newFolder]);
          
          pushToast({
            kind: 'success',
            title: 'Subfolder created',
            message: `"${name}" has been created successfully`
          });
        } else {
          console.error('❌ Parent subfolder not found:', createFolderParentId);
          pushToast({
            kind: 'error',
            title: 'Failed to create subfolder',
            message: 'Parent folder not found'
          });
        }
      }
      
      setShowCreateFolderModal(false);
      setCreateFolderParentId(null);
    } catch (error) {
      console.error('❌ Failed to create subfolder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      pushToast({
        kind: 'error',
        title: 'Failed to create subfolder',
        message: errorMessage
      });
    }
  };

  // Handle upload
  const handleUpload = () => {
    setShowUploadModal(true);
  };
  
  // Handle upload complete
  const handleUploadComplete = () => {
    // Reload documents after successful upload
    window.location.reload();
  };

  // Handle use in chat
  const handleUseInChat = (doc: Doc) => {
    navigate('/chat', { state: { documentId: doc.id, documentTitle: doc.title } });
  };

  // Handle remove document
  const handleRemoveDoc = async (doc: Doc) => {
    if (!confirm(`Remove "${doc.title}"?`)) return;
    
    try {
      // TODO: Implement document removal API
      console.log('Remove document:', doc.id);
      window.location.reload();
    } catch (error) {
      console.error('Failed to remove document:', error);
    }
  };

  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing Knowledge Base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 md:gap-3">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="md"
            className="p-2"
            aria-label="Go back to previous page"
          >
            <ChevronLeft size={20} />
          </Button>
          {/* Hamburger menu for mobile */}
          {isMobile && (
            <Button
              onClick={() => setShowSidebar(!showSidebar)}
              variant="ghost"
              size="md"
              className="p-2"
              aria-label={showSidebar ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={showSidebar}
            >
              <Menu size={20} />
            </Button>
          )}
          <h1 className="text-lg md:text-xl font-semibold">Knowledge Workspace</h1>
        </div>
        
        {/* Help Button */}
        <Button
          onClick={() => startTour()}
          variant="secondary"
          size="sm"
          title="Show quick tour"
          aria-label="Start guided tour"
        >
          <span className="hidden sm:inline">Help</span>
          <span className="sm:hidden" aria-hidden="true">?</span>
        </Button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden" role="main">
        {/* Left Sidebar - Folder Tree + Upload - Desktop only */}
        {!isMobile && (
          <aside 
            className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 overflow-y-auto"
            aria-label="Folder navigation"
          >
            <div className="mb-6">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 font-semibold" id="folders-heading">
                Folders
            </h2>
            
            {/* Single Upload Button */}
            <Button
              onClick={handleUpload}
              variant="primary"
              size="md"
              className="w-full mb-3"
              data-tour="upload"
              aria-label="Upload new documents"
            >
              <Upload size={16} aria-hidden="true" />
              Upload Documents
            </Button>
            
            {loading ? (
              <div className="space-y-2">
                {/* Skeleton for folder tree */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="pl-" style={{ paddingLeft: `${(i % 3) * 20}px` }}>
                    <Skeleton className="h-8 w-full rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div data-tour="folders">
                <FolderTreeRecursive
                  root={folderTree}
                  activeId={activeFolderId}
                  onSelect={handleFolderSelect}
                  onCreateSubfolder={handleCreateSubfolder}
                />
              </div>
            )}
          </div>
        </aside>
      )}
      
        {/* Mobile Sidebar Drawer */}
        {isMobile && (
          <Drawer open={showSidebar} onClose={() => setShowSidebar(false)} side="left">
            <div className="h-full bg-white dark:bg-gray-800 p-4 overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4 font-semibold">
                  Folders
                </h2>
                
                {/* Upload Button */}
                <Button
                  onClick={() => {
                    handleUpload();
                    setShowSidebar(false);
                  }}
                  variant="primary"
                  size="md"
                  className="w-full mb-4"
                >
                  <Upload size={16} />
                  Upload Documents
                </Button>
                
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="pl-" style={{ paddingLeft: `${(i % 3) * 20}px` }}>
                        <Skeleton className="h-8 w-full rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <FolderTreeRecursive
                    root={folderTree}
                    activeId={activeFolderId}
                    onSelect={(id) => {
                      handleFolderSelect(id);
                      setShowSidebar(false);
                    }}
                    onCreateSubfolder={handleCreateSubfolder}
                  />
                )}
              </div>
            </div>
          </Drawer>
        )}

        {/* Center Panel - Search & Document List */}
        <section className="flex-1 flex flex-col bg-white dark:bg-gray-800" aria-labelledby="documents-section">
          {/* Search Bar (no upload button) */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700" data-tour="search" role="search">
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
            />
            
            {/* Persistent inline error for Qdrant issues */}
            {qdrantIssue && (
              <InlineNotice
                kind="warning"
                title={qdrantIssue.title}
                message={qdrantIssue.message}
                className="mt-3"
                onDismiss={() => setQdrantIssue(null)}
              />
            )}
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-3">
              <h2 id="documents-section" className="text-sm font-medium text-gray-700 dark:text-gray-300" aria-live="polite" aria-atomic="true">
                {isSearching ? 'Searching...' : 
                 loadingDocuments ? 'Loading...' :
                 `${visibleDocuments.length} ${visibleDocuments.length === 1 ? 'document' : 'documents'}`}
                {activeFolderId && ` in selected folder`}
                {searchQuery && ` matching "${searchQuery}"`}
              </h2>
            </div>
            
            {isSearching || loadingDocuments ? (
              <div className="space-y-3">
                {/* Skeleton for document list */}
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                ))}
              </div>
            ) : (
              <DocList 
                docs={visibleDocuments} 
                activeDocId={activeDocId} 
                onSelect={setActiveDocId} 
              />
            )}
          </div>
        </section>

        {/* Right Panel - Document Preview - Hidden on mobile */}
        {!isMobile && (
          <aside 
            className="w-96 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto"
            aria-label="Document preview"
          >
            <DocPreviewEnhanced 
              doc={activeDoc} 
              onUseInChat={handleUseInChat} 
              onRemove={handleRemoveDoc}
            />
          </aside>
        )}
        
        {/* Mobile Document Preview - Full screen overlay when document is selected */}
        {isMobile && activeDoc && (
          <div 
            className="fixed inset-0 z-40 bg-white dark:bg-gray-900 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-doc-title"
          >
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
              <h2 id="mobile-doc-title" className="font-medium text-lg truncate">{activeDoc.title}</h2>
              <Button
                onClick={() => setActiveDocId(null)}
                variant="ghost"
                size="md"
                className="p-2"
                aria-label="Close document preview"
              >
                <X size={20} aria-hidden="true" />
              </Button>
            </div>
            <div className="p-4">
              <DocPreviewEnhanced 
                doc={activeDoc} 
                onUseInChat={handleUseInChat} 
                onRemove={handleRemoveDoc}
              />
            </div>
          </div>
        )}
      </main>

      {/* Create Subfolder Modal */}
      <Modal
        isOpen={showCreateFolderModal}
        onClose={() => {
          setShowCreateFolderModal(false);
          setCreateFolderParentId(null);
        }}
        title="Create New Subfolder"
        size="sm"
        role="dialog"
        aria-labelledby="create-folder-title"
      >
        <h2 id="create-folder-title" className="sr-only">Create New Subfolder</h2>
        <label htmlFor="new-folder-name" className="sr-only">Subfolder name</label>
        <Input
          id="new-folder-name"
          type="text"
          placeholder="Subfolder name"
          className="w-full mb-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              createSubfolder((e.target as HTMLInputElement).value);
            } else if (e.key === 'Escape') {
              setShowCreateFolderModal(false);
              setCreateFolderParentId(null);
            }
          }}
          autoFocus
          aria-required="true"
          aria-describedby="folder-name-help"
        />
        <span id="folder-name-help" className="sr-only">Enter a name for the new subfolder</span>
        <div className="flex gap-2" role="group" aria-label="Modal actions">
          <Button
            onClick={() => {
              const input = document.getElementById('new-folder-name') as HTMLInputElement;
              if (input) createSubfolder(input.value);
            }}
            variant="primary"
            size="md"
            className="flex-1"
            aria-label="Create subfolder"
          >
            Create
          </Button>
          <Button
            onClick={() => {
              setShowCreateFolderModal(false);
              setCreateFolderParentId(null);
            }}
            variant="secondary"
            size="md"
            className="flex-1"
            aria-label="Cancel subfolder creation"
          >
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        primaryFolders={primaryFolders}
        subfolders={subfolders}
        selectedFolderId={activeFolderId}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};