import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, Upload, Plus, Loader2 } from 'lucide-react';
import FolderTreeEnhanced, { type FolderNode } from '../components/knowledge/FolderTreeEnhanced';
import SearchBar from '../components/knowledge/SearchBar';
import DocList from '../components/knowledge/DocList';
import DocPreview from '../components/knowledge/DocPreview';
import type { Doc } from '../types/knowledge';
import type { Folder as FolderType } from '../services/folderService';
import type { PrimaryFolder } from '../types/primaryFolder';
import { primaryFolderService } from '../services/primaryFolderService';
import { folderService } from '../services/folderService';
import { ApiSearchService } from '../services/apiSearchService';
import { useSearchService } from '../hooks/useSearchService';
import { useNavigate } from 'react-router-dom';

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

  return {
    id: apiDoc.id,
    title: apiDoc.title || apiDoc.metadata?.originalName || 'Untitled',
    folder: apiDoc.folderId || apiDoc.primaryFolderId || '',
    type: getDocType(apiDoc.fileType),
    updated: getRelativeTime(apiDoc.uploadedAt || apiDoc.metadata?.uploadedAt || new Date())
  };
};

export const KnowledgeImproved = () => {
  const navigate = useNavigate();
  const apiService = new ApiSearchService();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Data state
  const [primaryFolders, setPrimaryFolders] = useState<PrimaryFolder[]>([]);
  const [subfolders, setSubfolders] = useState<FolderType[]>([]);
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  
  // Search service
  const {
    searchResults,
    isSearching,
    isInitialized,
    search,
    clearResults
  } = useSearchService();

  // Load primary folders on mount
  useEffect(() => {
    const loadPrimaryFolders = async () => {
      setLoading(true);
      try {
        const data = await primaryFolderService.getPrimaryFolders('admin-1', true);
        setPrimaryFolders(data);
        // Auto-expand all primary folders for better UX
        setExpandedFolders(new Set(data.map(f => f.id)));
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

  // Load documents based on selection
  useEffect(() => {
    const loadDocuments = async () => {
      if (!isInitialized) return;
      
      setLoadingDocuments(true);
      try {
        // Determine what to load based on selection
        let primaryFolderId: string | undefined;
        let subfolderId: string | undefined;
        
        if (selectedFolderId) {
          // Check if it's a primary folder or subfolder
          const isPrimary = primaryFolders.some(f => f.id === selectedFolderId);
          
          if (isPrimary) {
            primaryFolderId = selectedFolderId;
            // Load all documents in this primary folder and its subfolders
          } else {
            // It's a subfolder
            const subfolder = subfolders.find(f => f.id === selectedFolderId);
            if (subfolder) {
              subfolderId = selectedFolderId;
              primaryFolderId = subfolder.primaryFolderId;
            }
          }
        }
        
        // Fetch documents
        const result = await apiService.getDocuments(
          'admin-1',
          true,
          subfolderId,
          100, // Get more documents
          0,
          primaryFolderId
        );
        
        setAllDocuments(result.documents);
      } catch (error) {
        console.error('Failed to load documents:', error);
        setAllDocuments([]);
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadDocuments();
  }, [selectedFolderId, isInitialized, primaryFolders, subfolders]);

  // Build folder tree structure
  const folderTree = useMemo((): FolderNode[] => {
    const tree: FolderNode[] = [];
    
    // Add primary folders
    primaryFolders.forEach(pf => {
      const node: FolderNode = {
        id: pf.id,
        name: pf.name,
        type: 'primary',
        children: [],
        documentCount: 0
      };
      
      // Add subfolders as children
      const children = subfolders
        .filter(sf => sf.primaryFolderId === pf.id)
        .map(sf => ({
          id: sf.id,
          name: sf.name,
          type: 'subfolder' as const,
          parentId: pf.id,
          documentCount: sf.documentCount || 0
        }));
      
      node.children = children;
      
      // Count documents in this primary folder
      const primaryDocs = allDocuments.filter(doc => 
        doc.primaryFolderId === pf.id || 
        (doc.folderId && children.some(c => c.id === doc.folderId))
      );
      node.documentCount = primaryDocs.length;
      
      tree.push(node);
    });
    
    return tree;
  }, [primaryFolders, subfolders, allDocuments]);

  // Get documents to display
  const displayDocuments = useMemo(() => {
    let docs: any[] = [];
    
    if (searchQuery && searchResults.length > 0) {
      // Show search results
      docs = searchResults;
    } else {
      // Show all documents or filtered by folder
      docs = allDocuments;
    }
    
    // Apply folder filtering
    if (selectedFolderId) {
      // Check if it's a primary folder
      const isPrimary = primaryFolders.some(f => f.id === selectedFolderId);
      
      if (isPrimary) {
        // Show all documents in this primary folder and its subfolders
        const subfoldersInPrimary = subfolders
          .filter(sf => sf.primaryFolderId === selectedFolderId)
          .map(sf => sf.id);
        
        docs = docs.filter(doc => 
          doc.primaryFolderId === selectedFolderId ||
          doc.folderId === selectedFolderId ||
          (doc.folderId && subfoldersInPrimary.includes(doc.folderId))
        );
      } else {
        // It's a subfolder - show only documents in this specific subfolder
        docs = docs.filter(doc => doc.folderId === selectedFolderId);
      }
    }
    
    // Convert to Doc type for display
    return docs.map(doc => convertToDoc(doc));
  }, [searchQuery, searchResults, allDocuments, selectedFolderId, primaryFolders, subfolders]);

  // Get active document
  const activeDoc = displayDocuments.find(d => d.id === activeDocId) || null;

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      clearResults();
      return;
    }

    // Build filters based on selection
    let filters: any = {};
    
    if (selectedFolderId) {
      const isPrimary = primaryFolders.some(f => f.id === selectedFolderId);
      if (isPrimary) {
        filters.primaryFolderId = selectedFolderId;
      } else {
        filters.folderId = selectedFolderId;
        // Also add primary folder ID for better filtering
        const subfolder = subfolders.find(f => f.id === selectedFolderId);
        if (subfolder) {
          filters.primaryFolderId = subfolder.primaryFolderId;
        }
      }
    }

    await search(searchQuery, filters);
  }, [searchQuery, selectedFolderId, primaryFolders, subfolders, search, clearResults]);

  // Handle folder selection
  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    // Clear search when changing folders
    if (searchQuery) {
      setSearchQuery('');
      clearResults();
    }
  };

  // Toggle folder expansion
  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Handle upload
  const handleUpload = () => {
    // Navigate to the original Knowledge page upload modal with pre-selected folder
    const params = new URLSearchParams();
    if (selectedFolderId) {
      const isPrimary = primaryFolders.some(f => f.id === selectedFolderId);
      if (isPrimary) {
        params.set('primaryFolder', selectedFolderId);
      } else {
        const subfolder = subfolders.find(f => f.id === selectedFolderId);
        if (subfolder) {
          params.set('primaryFolder', subfolder.primaryFolderId);
          params.set('subfolder', selectedFolderId);
        }
      }
    }
    navigate(`/knowledge-original?${params.toString()}`);
  };

  // Handle use in chat
  const handleUseInChat = (doc: Doc) => {
    console.log('Use in chat:', doc);
    navigate('/chat', { state: { documentId: doc.id, documentTitle: doc.title } });
  };

  // Handle remove document
  const handleRemoveDoc = async (doc: Doc) => {
    if (!confirm(`Remove "${doc.title}"?`)) return;
    
    try {
      // TODO: Implement document removal API call
      console.log('Remove document:', doc.id);
      // Refresh documents after removal
      window.location.reload();
    } catch (error) {
      console.error('Failed to remove document:', error);
    }
  };

  // Get current folder name
  const getCurrentFolderName = () => {
    if (!selectedFolderId) return null;
    
    // Check primary folders
    const primaryFolder = primaryFolders.find(f => f.id === selectedFolderId);
    if (primaryFolder) return primaryFolder.name;
    
    // Check subfolders
    const subfolder = subfolders.find(f => f.id === selectedFolderId);
    if (subfolder) {
      const parent = primaryFolders.find(f => f.id === subfolder.primaryFolderId);
      return parent ? `${parent.name} / ${subfolder.name}` : subfolder.name;
    }
    
    return null;
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold">Knowledge Workspace</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {showRightPanel ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Folder Tree */}
        <aside className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 font-semibold">
              Folders
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <FolderTreeEnhanced
                folders={folderTree}
                activeFolderId={selectedFolderId}
                expandedFolders={expandedFolders}
                onSelect={handleFolderSelect}
                onToggleExpand={handleToggleExpand}
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleUpload}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <Upload size={16} />
              Upload Documents
            </button>
            <button
              onClick={() => navigate('/knowledge-original')}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Plus size={16} />
              Manage Folders
            </button>
          </div>
        </aside>

        {/* Center Panel - Search & Document List */}
        <main className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              onUpload={handleUpload} 
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  clearResults();
                }}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear search
              </button>
            )}
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isSearching ? 'Searching...' : 
                 loadingDocuments ? 'Loading...' :
                 `${displayDocuments.length} ${displayDocuments.length === 1 ? 'document' : 'documents'}`}
                {getCurrentFolderName() && ` in ${getCurrentFolderName()}`}
              </h2>
              {searchQuery && (
                <button
                  onClick={handleSearch}
                  className="px-3 py-1 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  Search
                </button>
              )}
            </div>
            
            {isSearching || loadingDocuments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <DocList 
                docs={displayDocuments} 
                activeDocId={activeDocId} 
                onSelect={setActiveDocId} 
              />
            )}
          </div>
        </main>

        {/* Right Panel - Document Preview (Collapsible) */}
        {showRightPanel && (
          <aside className="w-96 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto">
            <DocPreview 
              doc={activeDoc} 
              onUseInChat={handleUseInChat} 
              onRemove={handleRemoveDoc}
              onClose={() => setShowRightPanel(false)}
            />
          </aside>
        )}
      </div>
    </div>
  );
};