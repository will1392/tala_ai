import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Database,
  FileSearch,
  Upload,
  X,
  Image as ImageIcon,
  FileAudio,
  FileWarning
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { VoiceCategorySelector } from './VoiceCategorySelector';
import { CategoryDetectionService, type Category } from '../../services/categoryDetectionService';

type UploadableFile = {
  file: File;
  type: 'document' | 'image' | 'audio' | 'other';
  previewUrl?: string;
};

interface DocumentUploadOptionsProps {
  files: UploadableFile[];
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

  // Detect category based on file names
  const detectCategoryFromFiles = () => {
    const allFileNames = files.map(f => f.file.name).join(' ');
    const detected = CategoryDetectionService.detectCategory(allFileNames);
    setSuggestedCategory(detected);
    setSelectedCategory(detected);
  };

  // Initialize category detection when component mounts
  useEffect(() => {
    detectCategoryFromFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const getFilePreview = (file: UploadableFile) => {
    const sizeInMB = (file.file.size / (1024 * 1024)).toFixed(2);
    const typeLabel = file.type === 'document'
      ? 'Document'
      : file.type === 'image'
      ? 'Image'
      : file.type === 'audio'
      ? 'Audio'
      : 'File';
    return {
      name: file.file.name,
      size: `${sizeInMB} MB`,
      type: typeLabel
    };
  };

  const getIconForFile = (file: UploadableFile) => {
    switch (file.type) {
      case 'image':
        return <ImageIcon size={16} className="text-purple-300" />;
      case 'audio':
        return <FileAudio size={16} className="text-emerald-300" />;
      case 'document':
        return <FileText size={16} className="text-blue-300" />;
      default:
        return <FileWarning size={16} className="text-yellow-300" />;
    }
  };

  const fileTypeSummary = useMemo(() => {
    const summary = {
      document: 0,
      image: 0,
      audio: 0,
      other: 0
    };

    files.forEach(file => {
      summary[file.type] = summary[file.type] + 1;
    });

    return summary;
  }, [files]);

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
          <p className="text-xs text-gray-600 dark:text-white/60 mt-1">
            {files.length} file{files.length > 1 ? 's' : ''} selected ·
            {' '}
            {fileTypeSummary.document > 0 && `${fileTypeSummary.document} doc${fileTypeSummary.document > 1 ? 's' : ''}`}
            {fileTypeSummary.document > 0 && (fileTypeSummary.image > 0 || fileTypeSummary.audio > 0 || fileTypeSummary.other > 0) && ', '}
            {fileTypeSummary.image > 0 && `${fileTypeSummary.image} image${fileTypeSummary.image > 1 ? 's' : ''}`}
            {fileTypeSummary.image > 0 && (fileTypeSummary.audio > 0 || fileTypeSummary.other > 0) && ', '}
            {fileTypeSummary.audio > 0 && `${fileTypeSummary.audio} audio`}
            {fileTypeSummary.audio > 0 && fileTypeSummary.other > 0 && ', '}
            {fileTypeSummary.other > 0 && `${fileTypeSummary.other} other`}
          </p>
          <p className="text-xs text-gray-600 dark:text-white/50 mt-1">
            Tala can summarize documents, describe images, transcribe audio, and optionally store everything in your knowledge base.
          </p>
        </div>
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="p-1 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 min-h-0 min-w-0"
          title="Cancel upload"
        >
          <X size={14} />
        </Button>
      </div>

      {/* File Preview */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-700 dark:text-white/80">Files to process:</h4>
        <div className="space-y-1">
          {files.map((file, index) => {
            const preview = getFilePreview(file);
            return (
              <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded text-xs">
                {getIconForFile(file)}
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{preview.name}</span>
                  <span className="text-gray-500 dark:text-white/50">
                    {preview.type} · {preview.size}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Choose action:</h4>
        
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
              <div className="text-sm font-medium text-gray-900 dark:text-white">Extract Data Only</div>
              <div className="text-xs text-gray-600 dark:text-white/60">Process document content and show key information</div>
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
              <div className="text-sm font-medium text-gray-900 dark:text-white">Store in Knowledge Base</div>
              <div className="text-xs text-gray-600 dark:text-white/60">Save document for future AI reference</div>
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
              <div className="text-sm font-medium text-gray-900 dark:text-white">Extract Data & Store</div>
              <div className="text-xs text-gray-600 dark:text-white/60">Process content now and save for future use</div>
            </div>
          </label>
        </div>
      </div>

      {/* Extract Options */}
      {(selectedAction === 'extract' || selectedAction === 'both') && fileTypeSummary.document > 0 && (
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
              <span className="text-sm text-gray-900 dark:text-white">Summary - Key points and overview</span>
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
              <span className="text-sm text-gray-900 dark:text-white">Key Data - Important facts and figures</span>
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
              <span className="text-sm text-gray-900 dark:text-white">Full Text - Complete document content</span>
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
            voiceContent={files.map(f => f.file.name).join(', ')}
          />

          {/* Tags Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700 dark:text-white/80">Tags (optional):</label>
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
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white/80 text-xs"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="primary"
          size="sm"
          className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-xs"
        >
          {selectedAction === 'extract' ? 'Extract Data' : 
           selectedAction === 'store' ? 'Store Documents' : 
           'Extract & Store'}
        </Button>
      </div>
    </motion.div>
  );
};

export type { DocumentUploadDecision, UploadableFile };