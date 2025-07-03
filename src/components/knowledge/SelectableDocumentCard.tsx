import { Clock, Eye, Folder, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';
import { DocumentMenu } from './DocumentMenu';

interface Document {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  uploadedBy: string;
  uploadedAt: Date;
  size: string;
  views: number;
  starred: boolean;
  folderId?: string;
  folderName?: string;
}

interface SelectableDocumentCardProps {
  document: Document;
  viewMode: 'grid' | 'list';
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onClick?: (document: Document) => void;
  onSelect?: (documentId: string, selected: boolean) => void;
  onDelete?: (documentId: string) => void;
  onMove?: (documentId: string) => void;
}

export const SelectableDocumentCard = ({ 
  document, 
  viewMode, 
  isSelected = false,
  isSelectionMode = false,
  onClick, 
  onSelect,
  onDelete, 
  onMove 
}: SelectableDocumentCardProps) => {
  const categoryIcons: Record<string, string> = {
    visa: '🛂',
    airline: '✈️',
    destination: '🗺️',
    agency: '📋',
  };

  const handleViewDocument = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // If in selection mode, toggle selection instead of viewing
    if (isSelectionMode && onSelect) {
      onSelect(document.id, !isSelected);
      return;
    }
    
    console.log('Document clicked:', document.title);
    if (onClick) {
      onClick(document);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(document.id, e.target.checked);
    }
  };

  if (viewMode === 'list') {
    return (
      <GlassCard 
        className={cn(
          "p-4 cursor-pointer transition-all duration-200",
          "hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20",
          isSelected && "ring-2 ring-primary bg-primary/10",
          isSelectionMode && "hover:bg-white/10"
        )}
        onClick={handleViewDocument}
      >
        <div className="flex items-center gap-4">
          {/* Selection Checkbox */}
          {isSelectionMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-shrink-0"
            >
              <label className="relative flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={handleCheckboxChange}
                  className="sr-only"
                />
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  isSelected 
                    ? "bg-primary border-primary text-white" 
                    : "border-white/30 hover:border-primary"
                )}>
                  {isSelected && <Check size={12} />}
                </div>
              </label>
            </motion.div>
          )}

          {/* Icon */}
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">{categoryIcons[document.category] || '📄'}</span>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-white truncate mb-1">
                  {document.title}
                </h3>
                <p className="text-white/70 text-sm line-clamp-1">
                  {document.excerpt}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {document.uploadedAt.toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {document.views}
                  </span>
                  <span>{document.size}</span>
                  {document.folderName && (
                    <span className="flex items-center gap-1">
                      <Folder size={12} />
                      {document.folderName}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              {!isSelectionMode && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDocument();
                    }}
                  >
                    <Eye size={16} />
                  </Button>
                  <DocumentMenu
                    documentId={document.id}
                    documentTitle={document.title}
                    onDelete={onDelete}
                    onMove={onMove}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Grid view
  return (
    <GlassCard 
      className={cn(
        "p-6 cursor-pointer transition-all duration-200 relative group",
        "hover:scale-105 hover:shadow-lg hover:shadow-primary/20",
        isSelected && "ring-2 ring-primary bg-primary/10",
        isSelectionMode && "hover:bg-white/10"
      )}
      onClick={handleViewDocument}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-3 left-3 z-10"
        >
          <label className="relative flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              className="sr-only"
            />
            <div className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
              isSelected 
                ? "bg-primary border-primary text-white" 
                : "border-white/30 hover:border-primary bg-black/20 backdrop-blur-sm"
            )}>
              {isSelected && <Check size={12} />}
            </div>
          </label>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <span className="text-2xl">{categoryIcons[document.category] || '📄'}</span>
        </div>
        {!isSelectionMode && (
          <DocumentMenu
            documentId={document.id}
            documentTitle={document.title}
            onDelete={onDelete}
            onMove={onMove}
          />
        )}
      </div>
      
      {/* Content */}
      <div className="mb-4">
        <h3 className="font-semibold text-lg text-white mb-2 line-clamp-2">
          {document.title}
        </h3>
        <p className="text-white/70 text-sm line-clamp-3 mb-3">
          {document.excerpt}
        </p>
        
        {/* Folder info */}
        {document.folderName && (
          <div className="flex items-center gap-1 text-xs text-primary mb-2">
            <Folder size={12} />
            <span>{document.folderName}</span>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-white/50">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {document.uploadedAt.toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {document.views}
          </span>
        </div>
        <span>{document.size}</span>
      </div>
      
      {/* Quick Actions (only show when not in selection mode) */}
      {!isSelectionMode && (
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button 
            variant="primary" 
            size="sm" 
            className="px-4 py-2 bg-primary/90 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDocument();
            }}
          >
            <Eye size={16} className="mr-1" />
            View Document
          </Button>
        </div>
      )}
    </GlassCard>
  );
};