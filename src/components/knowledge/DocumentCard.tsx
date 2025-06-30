import { FileText, Clock, Eye, Star, Download, Share2, Folder } from 'lucide-react';
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

interface DocumentCardProps {
  document: Document;
  viewMode: 'grid' | 'list';
  onClick?: (document: Document) => void;
  onDelete?: (documentId: string) => void;
  onMove?: (documentId: string) => void;
}

export const DocumentCard = ({ document, viewMode, onClick, onDelete, onMove }: DocumentCardProps) => {
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
    console.log('Document clicked:', document.title);
    if (onClick) {
      onClick(document);
    }
  };

  if (viewMode === 'list') {
    return (
      <GlassCard 
        className="group hover:scale-[1.02] hover:bg-primary/10 transition-all cursor-pointer" 
        onClick={handleViewDocument}
        style={{ cursor: 'pointer' }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">{categoryIcons[document.category] || '📄'}</span>
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-1">{document.title}</h3>
                <p className="text-white/60 text-sm mb-2">{document.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {document.uploadedAt.toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={14} />
                    {document.views} views
                  </span>
                  <span>{document.size}</span>
                  {document.folderName && (
                    <span className="flex items-center gap-1 text-primary/70">
                      <Folder size={14} />
                      {document.folderName}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button variant="ghost" size="sm" className="p-2 min-w-[40px]">
                  <Star size={18} className={cn(
                    document.starred ? 'fill-primary text-primary' : 'text-white/50'
                  )} />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 min-w-[40px]">
                  <Download size={18} />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 min-w-[40px]">
                  <Share2 size={18} />
                </Button>
                {(onDelete || onMove) && (
                  <DocumentMenu
                    documentId={document.id}
                    documentTitle={document.title}
                    currentFolderId={document.folderId}
                    onDelete={() => onDelete?.(document.id)}
                    onMove={() => onMove?.(document.id)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="group hover:scale-[1.05] transition-all cursor-pointer h-full" onClick={handleViewDocument}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <span className="text-2xl">{categoryIcons[document.category] || '📄'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="p-2">
              <Star size={18} className={cn(
                document.starred ? 'fill-primary text-primary' : 'text-white/50'
              )} />
            </Button>
            {(onDelete || onMove) && (
              <DocumentMenu
                documentId={document.id}
                documentTitle={document.title}
                currentFolderId={document.folderId}
                onDelete={() => onDelete?.(document.id)}
                onMove={() => onMove?.(document.id)}
              />
            )}
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{document.title}</h3>
          <p className="text-white/60 text-sm line-clamp-3 mb-2">{document.excerpt}</p>
          {document.folderName && (
            <div className="flex items-center gap-1.5 text-xs text-primary/70">
              <Folder size={14} />
              <span>{document.folderName}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {document.uploadedAt.toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {document.views}
            </span>
          </div>
          
          <div className="flex items-center gap-2 pt-3">
            <Button 
              variant="glass" 
              size="sm" 
              className="flex-1 min-h-[36px]"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDocument();
              }}
            >
              <FileText size={16} className="mr-2" />
              View
            </Button>
            <Button variant="ghost" size="sm" className="p-2 min-w-[36px]">
              <Download size={16} />
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};