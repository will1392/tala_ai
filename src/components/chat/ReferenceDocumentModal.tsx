import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, ExternalLink, Search, Copy, Eye, Loader2, FileAudio, Link } from 'lucide-react';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';

interface DocumentReference {
  title: string;
  type: 'document' | 'website';
  score?: number;
  documentId?: string;
  fileUrl?: string;
  mediaType?: string;
  audioDuration?: number;
  audioConfidence?: number;
}

interface DocumentContent {
  title: string;
  content: string;
  metadata?: {
    fileSize?: string;
    fileType?: string;
    uploadedAt?: string;
    pages?: number;
    author?: string;
    mediaType?: string;
    audioDuration?: number;
    audioConfidence?: number;
    audioLanguage?: string;
  };
  url?: string;
  fileUrl?: string;
  transcription?: {
    text: string;
    language?: string;
    duration?: number;
    confidence?: number;
  } | null;
}

interface ReferenceDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: DocumentReference | null;
}

export const ReferenceDocumentModal = ({ isOpen, onClose, reference }: ReferenceDocumentModalProps) => {
  const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && reference && reference.type === 'document' && reference.documentId) {
      fetchDocumentContent(reference.documentId);
    }
  }, [isOpen, reference]);

  const fetchDocumentContent = async (documentId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/documents/${documentId}?userId=admin-1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found or you don\'t have permission to view it');
        } else if (response.status === 403) {
          throw new Error('You don\'t have permission to view this document');
        } else {
          throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
      }

      const data = await response.json();
      setDocumentContent(data);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = async () => {
    if (documentContent?.content) {
      try {
        await navigator.clipboard.writeText(documentContent.content);
        // Show success feedback - you could replace this with a toast library
        const button = document.activeElement as HTMLElement;
        if (button) {
          const originalText = button.innerHTML;
          button.innerHTML = '✓ Copied!';
          setTimeout(() => {
            button.innerHTML = originalText;
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        // Fallback: show alert
        alert('Failed to copy to clipboard. Please try selecting and copying manually.');
      }
    }
  };

  const handleDownload = () => {
    if (documentContent) {
      const blob = new Blob([documentContent.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentContent.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm.trim()) return text;
    
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-400/30 text-yellow-200 rounded px-1">$1</mark>');
  };

  const formatContent = (content: string) => {
    // Simple formatting detection
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        return <br key={index} />;
      }
      
      // Headers (lines with all caps or starting with numbers)
      if (trimmedLine.match(/^[A-Z\s\d\-\.]{10,}$/) || trimmedLine.match(/^\d+\.\s/)) {
        return (
          <h3 key={index} className="font-semibold text-white mt-4 mb-2 text-lg">
            <span dangerouslySetInnerHTML={{ __html: highlightSearchTerm(trimmedLine) }} />
          </h3>
        );
      }
      
      // Bullet points
      if (trimmedLine.match(/^[\-\*\•]\s/)) {
        return (
          <li key={index} className="ml-4 mb-1 text-white/80">
            <span dangerouslySetInnerHTML={{ __html: highlightSearchTerm(trimmedLine.replace(/^[\-\*\•]\s/, '')) }} />
          </li>
        );
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="mb-2 text-white/80 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: highlightSearchTerm(trimmedLine) }} />
        </p>
      );
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] glass-dark rounded-xl border border-white/20 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                {reference?.mediaType === 'audio' ? (
                  <FileAudio size={24} className="text-primary" />
                ) : reference?.type === 'document' ? (
                  <FileText size={24} className="text-primary" />
                ) : (
                  <ExternalLink size={24} className="text-primary" />
                )}
                <div>
                  <h2 className="text-xl font-semibold text-white truncate max-w-md">
                    {reference?.title || 'Document'}
                  </h2>
                  {documentContent?.metadata && (
                    <div className="flex flex-wrap items-center gap-4 text-sm text-white/60 mt-1">
                      {documentContent.metadata.fileType && (
                        <span>{documentContent.metadata.fileType.toUpperCase()}</span>
                      )}
                      {documentContent.metadata.fileSize && (
                        <span>{documentContent.metadata.fileSize}</span>
                      )}
                      {documentContent.metadata.pages && (
                        <span>{documentContent.metadata.pages} pages</span>
                      )}
                      {(documentContent.metadata.mediaType === 'audio' || reference?.mediaType === 'audio') && (
                        <span className="flex items-center gap-1 text-emerald-300">
                          <FileAudio size={14} />
                          Audio Clip
                        </span>
                      )}
                      {documentContent.metadata.audioDuration && (
                        <span>{Math.round(documentContent.metadata.audioDuration)}s</span>
                      )}
                      {typeof documentContent.metadata.audioConfidence === 'number' && (
                        <span>{Math.round((documentContent.metadata.audioConfidence || 0) * 100)}% confidence</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search in document..."
                    className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
                  />
                </div>
                
                {/* Actions */}
                {documentContent && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyContent}
                      className="p-2"
                      title="Copy content"
                    >
                      <Copy size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownload}
                      className="p-2"
                      title="Download"
                    >
                      <Download size={16} />
                    </Button>
                  </>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2"
                  title="Close"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="flex items-center gap-3 text-white/60">
                    <Loader2 size={24} className="animate-spin" />
                    <span>Loading document...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="text-red-400 mb-2">⚠️ Error loading document</div>
                    <div className="text-white/60 text-sm">{error}</div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      onClick={() => reference?.documentId && fetchDocumentContent(reference.documentId)}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : documentContent ? (
                <div className="h-full overflow-y-auto p-6 space-y-6">
                  {documentContent.metadata?.mediaType === 'audio' && documentContent.fileUrl && (
                    <div className="p-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10">
                      <div className="flex items-center gap-2 text-emerald-300 font-medium">
                        <FileAudio size={18} />
                        Original audio clip
                      </div>
                      <audio controls src={documentContent.fileUrl} className="w-full mt-3 rounded">
                        Your browser does not support the audio element.
                      </audio>
                      <div className="mt-3 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
                        {documentContent.metadata?.audioDuration && (
                          <span>Duration: {Math.round(documentContent.metadata.audioDuration)} seconds</span>
                        )}
                        {documentContent.metadata?.audioLanguage && (
                          <span>Language: {documentContent.metadata.audioLanguage.toUpperCase()}</span>
                        )}
                        {typeof documentContent.metadata?.audioConfidence === 'number' && (
                          <span>
                            Confidence: {Math.round((documentContent.metadata.audioConfidence || 0) * 100)}%
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 inline-flex items-center gap-2 text-emerald-200 hover:text-emerald-100"
                        onClick={() => window.open(documentContent.fileUrl, '_blank')}
                      >
                        <Link size={14} />
                        Open audio in new tab
                      </Button>
                    </div>
                  )}

                  <div className="prose prose-invert max-w-none">
                    {formatContent(documentContent.content)}
                  </div>
                </div>
              ) : reference?.type === 'website' ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <ExternalLink size={48} className="text-primary mx-auto mb-4" />
                    <h3 className="text-white font-medium mb-2">External Website</h3>
                    <p className="text-white/60 mb-4">This reference links to an external website.</p>
                    {documentContent?.url && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => window.open(documentContent.url, '_blank')}
                        className="inline-flex items-center gap-2"
                      >
                        <ExternalLink size={16} />
                        Open Website
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center text-white/60">
                    <Eye size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No content available</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};