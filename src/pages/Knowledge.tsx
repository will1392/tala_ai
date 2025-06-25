import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Upload, Filter, Grid, List, FileText, Clock, Star } from 'lucide-react';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { SearchBar } from '../components/knowledge/SearchBar';
import { DocumentCard } from '../components/knowledge/DocumentCard';
import { UploadZone } from '../components/knowledge/UploadZone';
import { cn } from '../utils/cn';

const categories = [
  { id: 'all', label: 'All Documents', icon: '📄', count: 156 },
  { id: 'visa', label: 'Visa Policies', icon: '🛂', count: 45 },
  { id: 'airline', label: 'Airline Rules', icon: '✈️', count: 32 },
  { id: 'destination', label: 'Destinations', icon: '🗺️', count: 28 },
  { id: 'agency', label: 'Agency Docs', icon: '📋', count: 51 },
];

const mockDocuments = [
  {
    id: '1',
    title: 'Japan Visa Requirements 2024',
    category: 'visa',
    excerpt: 'Complete guide to Japan visa application process including required documents, fees, and processing times.',
    uploadedBy: 'Sarah Chen',
    uploadedAt: new Date('2024-01-15'),
    size: '2.4 MB',
    views: 234,
    starred: true,
  },
  {
    id: '2',
    title: 'United Airlines Baggage Policy',
    category: 'airline',
    excerpt: 'Current baggage allowances, fees, and restrictions for domestic and international flights.',
    uploadedBy: 'Mike Johnson',
    uploadedAt: new Date('2024-01-10'),
    size: '1.8 MB',
    views: 189,
    starred: false,
  },
  {
    id: '3',
    title: 'Schengen Visa Guide 2024',
    category: 'visa',
    excerpt: 'Everything you need to know about applying for a Schengen visa, including requirements and tips.',
    uploadedBy: 'Emma Davis',
    uploadedAt: new Date('2024-01-20'),
    size: '3.1 MB',
    views: 156,
    starred: true,
  },
  {
    id: '4',
    title: 'Travel Insurance Coverage',
    category: 'agency',
    excerpt: 'Comprehensive overview of travel insurance options and coverage details for different destinations.',
    uploadedBy: 'James Wilson',
    uploadedAt: new Date('2024-01-12'),
    size: '1.2 MB',
    views: 98,
    starred: false,
  },
];

export const Knowledge = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = mockDocuments.filter(doc => 
    (selectedCategory === 'all' || doc.category === selectedCategory) &&
    (searchQuery === '' || doc.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Knowledge Base</h1>
          <p className="text-white/70 text-sm sm:text-base">Search and manage your travel documents</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Upload size={20} />
          Upload Document
        </Button>
      </div>

      {/* Search Bar */}
      <div className="w-full">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Categories - Fixed Spacing */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/60">Filter by Category</h3>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap min-w-fit',
                'border border-white/10 backdrop-blur-md',
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
            Showing {filteredDocuments.length} documents
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
      <motion.div
        layout
        className={cn(
          'grid gap-6',
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        )}
      >
        {filteredDocuments.map((doc, index) => (
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

      {/* Upload Modal */}
      {showUpload && (
        <UploadZone onClose={() => setShowUpload(false)} />
      )}
    </div>
  );
};