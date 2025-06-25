import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Filter, Grid, List, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/shared/Button';
import { SearchBar } from '../components/knowledge/SearchBar';
import { DocumentCard } from '../components/knowledge/DocumentCard';
import { UploadZone } from '../components/knowledge/UploadZone';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useSearchService } from '../hooks/useSearchService';
import { cn } from '../utils/cn';

export const Knowledge = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [categories, setCategories] = useState([
    { id: 'all', label: 'All Documents', icon: '📄', count: 0 },
    { id: 'visa', label: 'Visa Policies', icon: '🛂', count: 0 },
    { id: 'airline', label: 'Airline Rules', icon: '✈️', count: 0 },
    { id: 'destination', label: 'Destinations', icon: '🗺️', count: 0 },
    { id: 'agency', label: 'Agency Docs', icon: '📋', count: 0 },
  ]);

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

  // Load statistics and update categories on mount
  useEffect(() => {
    const loadStatistics = async () => {
      if (!isInitialized) return;
      
      try {
        const stats = await getStatistics();
        
        setCategories([
          { id: 'all', label: 'All Documents', icon: '📄', count: stats.totalDocuments },
          { id: 'visa', label: 'Visa Policies', icon: '🛂', count: stats.categoryCounts.visa || 0 },
          { id: 'airline', label: 'Airline Rules', icon: '✈️', count: stats.categoryCounts.airline || 0 },
          { id: 'destination', label: 'Destinations', icon: '🗺️', count: stats.categoryCounts.destination || 0 },
          { id: 'agency', label: 'Agency Docs', icon: '📋', count: stats.categoryCounts.agency || 0 },
        ]);
      } catch (err) {
        console.warn('Failed to load statistics:', err);
      }
    };

    loadStatistics();
  }, [isInitialized, getStatistics]);

  // Handle search
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      clearResults();
      return;
    }

    await search(query, { 
      category: selectedCategory as any 
    });
  };

  // Handle category change
  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    
    // Re-run search with new category if there's an active search
    if (searchResults.length > 0) {
      // Get the current search query from SearchBar - we'll need to pass it down
      // For now, let's clear results when category changes
      clearResults();
    }
  };

  // Transform search results to match DocumentCard interface
  const transformedDocuments = searchResults.map(result => ({
    id: result.id,
    title: result.title,
    category: result.category,
    excerpt: result.excerpt,
    uploadedBy: result.metadata.author || 'Unknown',
    uploadedAt: new Date(result.metadata.uploadedAt),
    size: `${(result.metadata.fileSize / 1024 / 1024).toFixed(1)} MB`,
    views: Math.floor(Math.random() * 500) + 50, // Mock views for now
    starred: Math.random() > 0.7, // Random starred status
    score: result.score,
    highlights: result.highlights
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
        <Button 
          variant="primary" 
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 w-full sm:w-auto justify-center"
          disabled={!isInitialized}
        >
          <Upload size={20} />
          Upload Document
        </Button>
      </div>

      {/* Search Bar */}
      <div className="w-full">
        <SearchBar 
          onSearch={handleSearch}
          disabled={!isInitialized}
          isSearching={isSearching}
        />
      </div>

      {/* Categories - Fixed Spacing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/60">Filter by Category</h3>
          {processingTime > 0 && (
            <span className="text-xs text-white/50">
              Search completed in {processingTime}ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCategoryChange(category.id)}
              disabled={!isInitialized}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap min-w-fit',
                'border border-white/10 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed',
                selectedCategory === category.id 
                  ? 'bg-primary/20 border-primary shadow-lg shadow-primary/25' 
                  : 'bg-white/5 hover:bg-white/10'
              )}
            >
              <span className="text-lg">{category.icon}</span>
              <span className="font-medium text-sm">{category.label}</span>
              <span className="text-xs text-white/60">({category.count})</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Toolbar - Better Spacing */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="glass" size="sm" className="px-3 py-2">
            <Filter size={18} />
          </Button>
          <span className="text-sm text-white/60">
            {isSearching ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Searching...
              </span>
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
      {isSearching ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-white/70">Searching knowledge base...</p>
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
              <DocumentCard document={doc} viewMode={viewMode} />
            </motion.div>
          ))}
        </motion.div>
      ) : searchResults.length === 0 && totalResults === 0 ? (
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
      ) : (
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
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadZone onClose={() => setShowUpload(false)} />
      )}
    </div>
  );
};