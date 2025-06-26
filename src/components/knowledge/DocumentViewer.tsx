import { X, Download, Share2, FileText, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../shared/Button';
import { GlassCard } from '../layout/GlassCard';
import { Document, Page, pdfjs } from 'react-pdf';
import { useState } from 'react';
import '../../styles/pdf-viewer.css';

// Set worker source for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.js';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    title: string;
    content: string;
    category: string;
    uploadedBy: string;
    uploadedAt: Date;
    size: string;
    fileUrl?: string;
    fileType?: string;
  } | null;
}

export const DocumentViewer = ({ isOpen, onClose, document }: DocumentViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  
  if (!document) return null;

  const categoryIcons: Record<string, string> = {
    visa: '🛂',
    airline: '✈️',
    destination: '🗺️',
    agency: '📋',
    general: '📄',
  };

  const isPDF = document.fileType === 'application/pdf' && document.fileUrl;
  
  console.log('DocumentViewer Debug:', {
    fileType: document.fileType,
    fileUrl: document.fileUrl,
    isPDF: isPDF,
    title: document.title
  });
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully:', numPages, 'pages');
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={onClose}
          >
            <div 
              className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 border-b border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">{categoryIcons[document.category] || '📄'}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">{document.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {document.uploadedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {document.uploadedAt.toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText size={14} />
                        {document.size}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      try {
                        const blob = new Blob([document.content], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const link = window.document.createElement('a');
                        link.href = url;
                        link.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
                        link.style.display = 'none';
                        window.document.body.appendChild(link);
                        link.click();
                        window.document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('Download failed:', error);
                        alert('Download failed. Please try again.');
                      }
                    }}
                  >
                    <Download size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    onClick={async () => {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: document.title,
                            text: document.content,
                          });
                        } catch (err) {
                          console.log('Share cancelled or failed');
                        }
                      } else {
                        // Fallback: copy to clipboard
                        try {
                          await navigator.clipboard.writeText(document.content);
                          alert('Document content copied to clipboard!');
                        } catch (err) {
                          console.error('Failed to copy to clipboard');
                        }
                      }
                    }}
                  >
                    <Share2 size={18} />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100" onClick={onClose}>
                    <X size={18} />
                  </Button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                {isPDF ? (
                  <div className="flex flex-col items-center">
                    <Document
                      file={`http://localhost:3001${document.fileUrl}`}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={<div className="p-4">Loading PDF...</div>}
                      error={<div className="p-4 text-red-500">Failed to load PDF</div>}
                      className="border border-gray-200 shadow-sm"
                    >
                      <Page 
                        pageNumber={pageNumber} 
                        width={Math.min(700, window.innerWidth - 100)}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        scale={1.0}
                      />
                    </Document>
                    
                    {numPages && numPages > 1 && (
                      <div className="flex items-center gap-4 mt-4 p-2 bg-gray-100 rounded-lg">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                          onClick={() => setPageNumber(page => Math.max(1, page - 1))}
                          disabled={pageNumber <= 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {pageNumber} of {numPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                          onClick={() => setPageNumber(page => Math.min(numPages || 1, page + 1))}
                          disabled={!numPages || pageNumber >= numPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="prose prose-gray max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-base">
                      {document.content}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  Category: <span className="text-blue-600 font-medium capitalize">{document.category}</span>
                </div>
                <Button variant="primary" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};