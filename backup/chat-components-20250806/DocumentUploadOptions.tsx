import { useState } from 'react';
import { FileText, Database, FolderOpen, Tag, FileSearch, Upload, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { VoiceCategorySelector } from './VoiceCategorySelector';
import { CategoryDetectionService, type Category } from '../../services/categoryDetectionService';

interface DocumentUploadOptionsProps {
  files: File[];
  onConfirm: (options: DocumentUploadDecision) => void;
  onCancel: () => void;
}

interface DocumentUploadDecision {
  action: 'extract' | 'store' | 'both';
  extractOptions?: {
    extractType: 'summary' | 'key-data' | 'full-text';
  };
  storeOptions?: {
    primaryFolderId?: string;
    category?: string;
    tags?: string[];
  };
}

export const DocumentUploadOptions = ({ files, onConfirm, onCancel }: DocumentUploadOptionsProps) => {
  const [selectedAction, setSelectedAction] = useState<'extract' | 'store' | 'both'>('both');
  const [extractType, setExtractType] = useState<'summary' | 'key-data' | 'full-text'>('summary');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<Category | null>(null);
  const [tags, setTags] = useState<string>('');
  const [showFolderSelector, setShowFolderSelector] = useState(false);

  // Detect category based on file names
  const detectCategoryFromFiles = () => {
    const allFileNames = files.map(f => f.name).join(' ');
    const detected = CategoryDetectionService.detectCategory(allFileNames);
    setSuggestedCategory(detected);
    setSelectedCategory(detected);
  };

  // Initialize category detection when component mounts
  useState(() => {
    detectCategoryFromFiles();
  });

  const handleConfirm = () => {
    const decision: DocumentUploadDecision = {
      action: selectedAction,
    };

    if (selectedAction === 'extract' || selectedAction === 'both') {
      decision.extractOptions = {
        extractType
      };
    }

    if (selectedAction === 'store' || selectedAction === 'both') {
      decision.storeOptions = {
        primaryFolderId: selectedCategory?.id,
        category: selectedCategory?.slug,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      };
    }

    onConfirm(decision);
  };

  const handleCategorySelect = (category: Category | null) => {
    if (category === null) {
      // Auto-detect was triggered
      detectCategoryFromFiles();
    } else {
      setSelectedCategory(category);
    }
  };

  const getFilePreview = (file: File) => {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      name: file.name,
      size: `${sizeInMB} MB`,
      type: file.type || 'Unknown type'
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Upload size={16} className="text-purple-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-purple-400 font-medium text-sm">What would you like to do with these documents?</p>
          <p className="text-xs text-white/60 mt-1">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
        </div>
        <button
          onClick={onCancel}
          className="p-1 text-white/40 hover:text-white/60 transition-colors"
          title="Cancel upload"
        >
          <X size={14} />
        </button>
      </div>

      {/* File Preview */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-white/80">Files to process:</h4>
        <div className="space-y-1">
          {files.map((file, index) => {
            const preview = getFilePreview(file);
            return (
              <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded text-xs">
                <FileText size={12} className="text-white/50" />
                <span className="flex-1 truncate">{preview.name}</span>
                <span className="text-white/50">{preview.size}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-white">Choose action:</h4>
        
        <div className="space-y-2">
          {/* Extract Data Option */}
          <label className={cn(
            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            selectedAction === 'extract' ? "bg-green-500/10 border-green-500/30" : "bg-white/5 border-white/10 hover:border-white/20"
          )}>
            <input
              type="radio"
              name="action"
              value="extract"
              checked={selectedAction === 'extract'}
              onChange={(e) => setSelectedAction(e.target.value as any)}
              className="sr-only"
            />
            <FileSearch size={16} className="text-green-400" />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Extract Data Only</div>
              <div className="text-xs text-white/60">Process document content and show key information</div>
            </div>
          </label>

          {/* Store in Knowledge Base Option */}
          <label className={cn(
            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            selectedAction === 'store' ? "bg-blue-500/10 border-blue-500/30" : "bg-white/5 border-white/10 hover:border-white/20"
          )}>
            <input
              type="radio"
              name="action"
              value="store"
              checked={selectedAction === 'store'}
              onChange={(e) => setSelectedAction(e.target.value as any)}
              className="sr-only"
            />
            <Database size={16} className="text-blue-400" />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Store in Knowledge Base</div>
              <div className="text-xs text-white/60">Save document for future AI reference</div>
            </div>
          </label>

          {/* Both Options */}
          <label className={cn(
            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            selectedAction === 'both' ? "bg-purple-500/10 border-purple-500/30" : "bg-white/5 border-white/10 hover:border-white/20"
          )}>
            <input
              type="radio"
              name="action"
              value="both"
              checked={selectedAction === 'both'}
              onChange={(e) => setSelectedAction(e.target.value as any)}
              className="sr-only"
            />
            <div className="flex items-center gap-1">
              <FileSearch size={14} className="text-purple-400" />
              <Database size={14} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Extract Data & Store</div>
              <div className="text-xs text-white/60">Process content now and save for future use</div>
            </div>
          </label>
        </div>
      </div>

      {/* Extract Options */}
      {(selectedAction === 'extract' || selectedAction === 'both') && (
        <div className="space-y-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
          <h4 className="text-sm font-medium text-green-400">Extraction Options:</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="extractType"
                value="summary"
                checked={extractType === 'summary'}
                onChange={(e) => setExtractType(e.target.value as any)}
                className="text-green-400"
              />
              <span className="text-sm text-white">Summary - Key points and overview</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="extractType"
                value="key-data"
                checked={extractType === 'key-data'}
                onChange={(e) => setExtractType(e.target.value as any)}
                className="text-green-400"
              />
              <span className="text-sm text-white">Key Data - Important facts and figures</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="extractType"
                value="full-text"
                checked={extractType === 'full-text'}
                onChange={(e) => setExtractType(e.target.value as any)}
                className="text-green-400"
              />
              <span className="text-sm text-white">Full Text - Complete document content</span>
            </label>
          </div>
        </div>
      )}

      {/* Storage Options */}
      {(selectedAction === 'store' || selectedAction === 'both') && (
        <div className="space-y-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <h4 className="text-sm font-medium text-blue-400">Storage Options:</h4>
          
          {/* Category Selector */}
          <VoiceCategorySelector
            onCategorySelect={handleCategorySelect}
            suggestedCategory={suggestedCategory}
            voiceContent={files.map(f => f.name).join(', ')}
          />

          {/* Tags Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/80">Tags (optional):</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., visa, requirements, 2024"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            />
            <p className="text-xs text-white/50">Separate multiple tags with commas</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-white/60 hover:text-white/80 rounded-md transition-colors text-xs font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-1.5 bg-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/30 transition-colors text-xs font-medium"
        >
          {selectedAction === 'extract' ? 'Extract Data' : 
           selectedAction === 'store' ? 'Store Documents' : 
           'Extract & Store'}
        </button>
      </div>
    </motion.div>
  );
};

export type { DocumentUploadDecision };