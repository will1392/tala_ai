import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Filter, Grid, List, AlertCircle, Loader2, FolderPlus, Folder } from 'lucide-react';
import { Button } from '../components/shared/Button';
import { SearchBar } from '../components/knowledge/SearchBar';
import { DocumentCard } from '../components/knowledge/DocumentCard';
import { UploadZone } from '../components/knowledge/UploadZone';
import { DocumentViewer } from '../components/knowledge/DocumentViewer';
import { CreateFolderModal } from '../components/knowledge/CreateFolderModal';
import { EditFolderModal } from '../components/knowledge/EditFolderModal';
import { DeleteFolderModal } from '../components/knowledge/DeleteFolderModal';
import { FolderMenu } from '../components/knowledge/FolderMenu';
import { DeleteDocumentModal } from '../components/knowledge/DeleteDocumentModal';
import { MoveDocumentModal } from '../components/knowledge/MoveDocumentModal';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useSearchService } from '../hooks/useSearchService';
import { folderService, type Folder as FolderType } from '../services/folderService';
import { ApiSearchService } from '../services/apiSearchService';
import { cn } from '../utils/cn';

export const Knowledge = () => {
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<{id: string, title: string} | null>(null);
  const [movingDocument, setMovingDocument] = useState<{id: string, title: string, folderId?: string} | null>(null);

  const {
    searchResults,
    isSearching,
    isInitialized,
    isInitializing,
    serviceInfo,
    search,
    clearResults,
    getStatistics,
    error,
    clearError,
    totalResults,
    processingTime
  } = useSearchService();

  // Create API service instance
  const apiService = new ApiSearchService();

  // Load folders on mount
  useEffect(() => {
    const loadFolders = async () => {
      if (!isInitialized) return;
      
      setLoadingFolders(true);
      try {
        const userFolders = await folderService.getFolders('admin-1', true);
        setFolders(userFolders);
      } catch (err) {
        console.warn('Failed to load folders:', err);
      } finally {
        setLoadingFolders(false);
      }
    };

    loadFolders();
  }, [isInitialized]);

  // Load all documents when folder changes
  useEffect(() => {
    const loadDocuments = async () => {
      if (!isInitialized || searchQuery) return; // Don't load if there's an active search
      
      setLoadingDocuments(true);
      try {
        const result = await apiService.getDocuments(
          'admin-1',
          true,
          selectedFolder === 'all' ? undefined : selectedFolder,
          10 // Limit to 10 most recent documents
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
  }, [isInitialized, selectedFolder, searchQuery]);

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      clearResults();
      setSearchQuery('');
      return;
    }

    await search(query, { 
      folderId: selectedFolder === 'all' ? undefined : selectedFolder
    });
  };

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
    await folderService.createFolder({
      name,
      description,
      userId: 'admin-1',
      isAdmin: true,
    });
    
    // Reload folders
    const userFolders = await folderService.getFolders('admin-1', true);
    setFolders(userFolders);
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
    setFolders(userFolders);
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
    setFolders(userFolders);
    setDeletingFolder(null);
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
        search(searchQuery, selectedFolder !== 'all' ? selectedFolder : undefined);
      } else {
        // If browsing, reload all documents
        const result = await apiService.getDocuments(
          'admin-1',
          true,
          selectedFolder === 'all' ? undefined : selectedFolder,
          10
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
  const handleMoveDocument = async (folderId: string | null) => {
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
          folderId: folderId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to move document');
      }

      // Reload documents
      if (searchQuery) {
        // If in search mode, re-run search
        search(searchQuery, selectedFolder !== 'all' ? selectedFolder : undefined);
      } else {
        // If browsing, reload all documents
        const result = await apiService.getDocuments(
          'admin-1',
          true,
          selectedFolder === 'all' ? undefined : selectedFolder,
          10
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

  // Transform documents based on search or browse mode
  const transformedDocuments = searchQuery ? 
    // Transform search results
    searchResults.map(result => ({
      id: result.id,
      title: result.metadata?.title || result.document?.originalName || 'Untitled',
      category: result.metadata?.category || 'general',
      excerpt: result.content ? result.content.substring(0, 200) + '...' : 'No preview available',
      uploadedBy: result.document?.userId || 'Unknown',
      uploadedAt: new Date(result.document?.uploadedAt || Date.now()),
      size: result.document?.fileSize ? `${(result.document.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
      views: Math.floor(Math.random() * 500) + 50, // Mock views for now
      starred: Math.random() > 0.7, // Random starred status
      score: result.score,
      highlights: [], // Backend doesn't provide highlights yet
      fileUrl: result.document?.fileUrl,
      fileType: result.document?.fileType,
      folderId: result.metadata?.folderId,
      folderName: result.metadata?.folderName
    })) :
    // Transform all documents
    allDocuments.map(doc => ({
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

      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Knowledge Base</h1>
          <p className="text-white/70 text-sm sm:text-base">
            Search and manage your travel documents
            {isInitialized && (
              <span className="ml-2 text-xs text-primary">
                • {serviceInfo.mode} mode
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button 
            variant="ghost" 
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
            disabled={!isInitialized}
          >
            <FolderPlus size={20} />
            Create Folder
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
            disabled={!isInitialized}
          >
            <Upload size={20} />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="w-full">
        <SearchBar 
          onSearch={handleSearch}
          disabled={!isInitialized}
          isSearching={isSearching}
        />
      </div>

      {/* Folders - Fixed Spacing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/60">Folders</h3>
          {processingTime > 0 && (
            <span className="text-xs text-white/50">
              Search completed in {processingTime}ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 overflow-x-auto overflow-y-visible pb-2 scrollbar-hide">
          {/* All Documents */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleFolderChange('all')}
            disabled={!isInitialized}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap min-w-fit',
              'border border-white/10 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed',
              selectedFolder === 'all' 
                ? 'bg-primary/20 border-primary shadow-lg shadow-primary/25' 
                : 'bg-white/5 hover:bg-white/10'
            )}
          >
            <span className="text-lg">📄</span>
            <span className="font-medium text-sm">All Documents</span>
            <span className="text-xs text-white/60">
              ({searchQuery ? `${transformedDocuments.length}` : selectedFolder === 'all' ? `${allDocuments.length}+` : allDocuments.length})
            </span>
          </motion.button>

          {/* User Folders */}
          {loadingFolders ? (
            <div className="flex items-center gap-2 px-4 py-2.5 text-white/50">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading folders...</span>
            </div>
          ) : (
            folders.map((folder) => (
              <motion.div
                key={folder.id}
                className="relative"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  onClick={() => handleFolderChange(folder.id)}
                  disabled={!isInitialized}
                  className={cn(
                    'flex items-center gap-2 px-4 pr-10 py-2.5 rounded-xl transition-all whitespace-nowrap min-w-fit w-full',
                    'border border-white/10 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed',
                    selectedFolder === folder.id 
                      ? 'bg-primary/20 border-primary shadow-lg shadow-primary/25' 
                      : 'bg-white/5 hover:bg-white/10'
                  )}
                >
                  <Folder size={18} className="text-primary" />
                  <span className="font-medium text-sm">{folder.name}</span>
                  <span className="text-xs text-white/60">({folder.documentCount})</span>
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-50">
                  <FolderMenu
                    folderId={folder.id}
                    folderName={folder.name}
                    onEdit={() => setEditingFolder(folder)}
                    onDelete={() => setDeletingFolder(folder)}
                  />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Toolbar - Better Spacing */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="glass" size="sm" className="px-3 py-2">
            <Filter size={18} />
          </Button>
          <span className="text-sm text-white/60">
            {isSearching || loadingDocuments ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                {isSearching ? 'Searching...' : 'Loading...'}
              </span>
            ) : searchQuery ? (
              `Found ${transformedDocuments.length} results for "${searchQuery}"`
            ) : (
              `Showing ${transformedDocuments.length} documents`
            )}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'glass'}
            size="sm"
            className="px-3 py-2"
            onClick={() => setViewMode('grid')}
          >
            <Grid size={18} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'glass'}
            size="sm"
            className="px-3 py-2"
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
          </Button>
        </div>
      </div>

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
            'grid gap-6',
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
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
              <DocumentCard 
                document={doc} 
                viewMode={viewMode} 
                onClick={(document) => {
                  if (searchQuery) {
                    // For search results, get the full content
                    const fullResult = searchResults.find(r => r.id === document.id);
                    
                    console.log('Knowledge.tsx Debug:', {
                      document: document,
                      fullResult: fullResult,
                      fileUrl: fullResult?.document?.fileUrl,
                      fileType: fullResult?.document?.fileType
                    });
                    
                    setSelectedDocument({
                      ...document,
                      content: fullResult?.content || document.excerpt,
                      fileUrl: fullResult?.document?.fileUrl,
                      fileType: fullResult?.document?.fileType
                    });
                  } else {
                    // For browsing mode, use document directly
                    setSelectedDocument({
                      ...document,
                      content: document.excerpt,
                      fileUrl: document.fileUrl,
                      fileType: document.fileType
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
      ) : !searchQuery && transformedDocuments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold mb-2">
            {selectedFolder === 'all' ? 'No Documents Yet' : 'Empty Folder'}
          </h3>
          <p className="text-white/60 mb-6">
            {selectedFolder === 'all' 
              ? 'Upload your first document to get started'
              : 'This folder doesn\'t contain any documents yet'}
          </p>
          <Button variant="primary" onClick={() => setShowUpload(true)}>
            <Upload size={20} className="mr-2" />
            Upload Document
          </Button>
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

      {/* Upload Modal */}
      {showUpload && (
        <UploadZone 
          onClose={() => {
            setShowUpload(false);
            // Reload documents and folders after upload
            if (isInitialized) {
              apiService.getDocuments(
                'admin-1',
                true,
                selectedFolder === 'all' ? undefined : selectedFolder
              ).then(result => {
                setAllDocuments(result.documents);
              }).catch(console.warn);
              
              folderService.getFolders('admin-1', true)
                .then(setFolders)
                .catch(console.warn);
            }
          }} 
          folders={folders} 
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
          folders={folders}
        />
      )}
    </div>
  );
};