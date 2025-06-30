import { X, Download, Share2, FileText, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../shared/Button';
import { GlassCard } from '../layout/GlassCard';
import { Document, Page, pdfjs } from 'react-pdf';
import { useState } from 'react';
import '../../styles/pdf-viewer.css';

// Back to the original working configuration
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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
  const [pdfLoadFailed, setPdfLoadFailed] = useState(false);
  
  if (!document) return null;

  const categoryIcons: Record<string, string> = {
    visa: '🛂',
    airline: '✈️',
    destination: '🗺️',
    agency: '📋',
    general: '📄',
  };

  const isPDF = document.fileType === 'application/pdf' && document.fileUrl;
  // Ensure the URL is properly encoded
  const pdfUrl = isPDF ? `http://localhost:3001${document.fileUrl}`.replace(/ /g, '%20') : '';
  
  console.log('DocumentViewer Debug:', {
    fileType: document.fileType,
    fileUrl: document.fileUrl,
    fullPdfUrl: pdfUrl,
    isPDF: isPDF,
    title: document.title
  });
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully:', numPages, 'pages');
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    console.error('PDF load error details:', {
      message: error.message,
      stack: error.stack,
      url: pdfUrl
    });
    setPdfLoadFailed(true);
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
                    {/* Use simple iframe for now - this should definitely work */}
                    <iframe
                      src={pdfUrl}
                      width="100%"
                      height="600px"
                      style={{ border: '1px solid #ddd', borderRadius: '8px' }}
                      title={document.title}
                      onLoad={() => console.log('PDF iframe loaded successfully')}
                      onError={() => console.error('PDF iframe failed to load')}
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      PDF displayed using browser's native viewer
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-gray max-w-none">
                    {pdfLoadFailed && isPDF && (
                      <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
                        <p className="text-yellow-800 text-sm">
                          PDF viewer failed to load. Showing text content instead.
                        </p>
                      </div>
                    )}
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