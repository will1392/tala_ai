import React, { useState, useEffect } from 'react';
import { BookOpen, Maximize2, X, CheckCircle2, Trash2, Tag, Link2, Calendar, Loader2 } from 'lucide-react';
import type { Doc } from '../../types/knowledge';
import Markdown from '../shared/Markdown';

type Props = {
  doc: Doc | null;
  onUseInChat?: (doc: Doc) => void;
  onRemove?: (doc: Doc) => void;
};

export default function DocPreviewEnhanced({ doc, onUseInChat, onRemove }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Fetch signed URL for S3 documents
  useEffect(() => {
    if (!doc) {
      setSignedUrl(null);
      return;
    }
    
    const fetchSignedUrl = async () => {
      // Check if this is an S3 URL that needs signing
      if (doc.previewUrl && (doc.previewUrl.includes('s3.amazonaws.com') || doc.previewUrl.includes('s3-'))) {
        setLoading(true);
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${baseUrl}/documents/${doc.id}/url?userId=admin-1&isAdmin=true`);
          
          if (response.ok) {
            const data = await response.json();
            setSignedUrl(data.url);
          } else {
            console.error('Failed to get signed URL:', response.status);
            // Fallback to original URL
            setSignedUrl(doc.previewUrl);
          }
        } catch (error) {
          console.error('Error fetching signed URL:', error);
          // Fallback to original URL
          setSignedUrl(doc.previewUrl);
        } finally {
          setLoading(false);
        }
      } else if (doc.previewUrl) {
        // Non-S3 URLs don't need signing
        setSignedUrl(doc.previewUrl);
      } else {
        setSignedUrl(null);
      }
    };
    
    fetchSignedUrl();
  }, [doc]);
  
  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <BookOpen size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a document to preview
        </p>
      </div>
    );
  }

  // Determine the appropriate preview URL
  const getPreviewUrl = () => {
    if (!signedUrl) return null;
    
    // Handle local API URLs - need to be proxied
    if (signedUrl.startsWith('/api/files/')) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      return `${baseUrl.replace('/api', '')}${signedUrl}`;
    }
    
    return signedUrl;
  };
  
  const previewUrl = getPreviewUrl();
  const isPdf = doc.type === 'PDF' || doc.previewUrl?.toLowerCase().includes('.pdf');
  
  const previewContent = (
    <div className="w-full h-full">
      {loading ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading preview...
            </p>
          </div>
        </div>
      ) : previewUrl ? (
        isPdf ? (
          <iframe 
            title={`Preview of ${doc.title}`}
            src={previewUrl} 
            className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
          />
        ) : (
          <div className="w-full h-full overflow-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {doc.content ? (
              doc.type === 'Markdown' ? (
                <Markdown content={doc.content} />
              ) : (
                <pre className="whitespace-pre-wrap text-sm">{doc.content}</pre>
              )
            ) : (
              <img src={previewUrl} alt={doc.title} className="max-w-full h-auto" />
            )}
          </div>
        )
      ) : doc.content ? (
        <div className="w-full h-full overflow-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {doc.type === 'Markdown' ? (
            <Markdown content={doc.content} />
          ) : (
            <pre className="whitespace-pre-wrap text-sm">{doc.content}</pre>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <BookOpen size={32} className="mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Document preview not available
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Supported formats: PDF, Images, Text
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-primary" aria-hidden="true" />
          <h3 className="font-semibold">Document Preview</h3>
        </div>
        <button
          onClick={() => setFullscreen(true)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Open document in fullscreen"
        >
          <Maximize2 size={14} aria-hidden="true" />
          Fullscreen
        </button>
      </div>

      {/* Document Info */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2" id="document-title">{doc.title}</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400" role="group" aria-label="Document metadata">
              <span className="flex items-center gap-1">
                <Tag size={14} aria-hidden="true" />
                <span aria-label="Document type">{doc.type}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} aria-hidden="true" />
                <span aria-label="Last updated">Updated {doc.updated}</span>
              </span>
            </div>
          </div>

          {/* Preview Area */}
          <div className="h-96">
            {previewContent}
          </div>

          {/* Tags/Metadata */}
          {doc.metadata?.tags && (
            <div>
              <h3 className="text-sm font-medium mb-2" id="document-tags-heading">Tags</h3>
              <div className="flex flex-wrap gap-2" role="list" aria-labelledby="document-tags-heading">
                {doc.metadata.tags.map((tag: string) => (
                  <span
                    key={tag}
                    role="listitem"
                    className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {(onUseInChat || onRemove) && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2" role="group" aria-label="Document actions">
          {onUseInChat && (
            <button
              onClick={() => onUseInChat(doc)}
              className="flex-1 rounded-xl bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label={`Use ${doc.title} in chat`}
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              Use in Chat
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(doc)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm hover:border-red-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              aria-label={`Remove ${doc.title} from library`}
            >
              <Trash2 size={16} aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      )}

      {/* Fullscreen Modal */}
      {fullscreen && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="fullscreen-document-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        >
          <div className="absolute inset-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <BookOpen size={20} className="text-primary" aria-hidden="true" />
              <h2 id="fullscreen-document-title" className="font-semibold text-lg truncate flex-1">{doc.title}</h2>
              <button 
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                onClick={() => setFullscreen(false)}
                aria-label="Close fullscreen view"
              >
                <X size={14} aria-hidden="true" />
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {/* Use same preview logic in fullscreen */}
              <div className="w-full h-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Loading preview...
                      </p>
                    </div>
                  </div>
                ) : previewUrl ? (
                  isPdf ? (
                    <iframe 
                      title={`Preview of ${doc.title}`}
                      src={previewUrl} 
                      className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-full h-full overflow-auto p-4">
                      {doc.content ? (
                        doc.type === 'Markdown' ? (
                          <Markdown content={doc.content} />
                        ) : (
                          <pre className="whitespace-pre-wrap text-sm">{doc.content}</pre>
                        )
                      ) : (
                        <img src={previewUrl} alt={doc.title} className="max-w-full h-auto" />
                      )}
                    </div>
                  )
                ) : doc.content ? (
                  <div className="w-full h-full overflow-auto p-4">
                    {doc.type === 'Markdown' ? (
                      <Markdown content={doc.content} />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">{doc.content}</pre>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <BookOpen size={48} className="mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Document preview not available
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}