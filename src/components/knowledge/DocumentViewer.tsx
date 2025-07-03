import { X, Download, Share2, FileText, Clock, User, Search, Type, Copy, Check, ArrowLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../shared/Button';
import { pdfjs } from 'react-pdf';
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
  currentPrimaryFolder?: string;
  currentSubFolder?: string;
  onNavigateToCategories?: () => void;
  onNavigateToPrimaryFolder?: () => void;
}

interface TextStructure {
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'code' | 'quote';
  content: string;
  level?: number;
  items?: string[];
}

export const DocumentViewer = ({ 
  isOpen, 
  onClose, 
  document, 
  currentPrimaryFolder,
  currentSubFolder,
  onNavigateToCategories,
  onNavigateToPrimaryFolder 
}: DocumentViewerProps) => {
  const [pdfLoadFailed, setPdfLoadFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormatted, setShowFormatted] = useState(true);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  
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

  // Enhanced text processing for better structure and readability
  const processTextContent = (content: string): TextStructure[] => {
    if (!content) return [];
    
    const lines = content.split('\n').filter(line => line.trim());
    const structures: TextStructure[] = [];
    let currentParagraph = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect headings (lines with fewer than 100 chars, all caps, or specific patterns)
      if (trimmed.length < 100 && (
        trimmed === trimmed.toUpperCase() || 
        /^[A-Z][A-Z\s]{2,}$/.test(trimmed) ||
        /^\d+\.\s/.test(trimmed) ||
        /^[IVX]+\.\s/.test(trimmed)
      )) {
        if (currentParagraph) {
          structures.push({ type: 'paragraph', content: currentParagraph.trim() });
          currentParagraph = '';
        }
        structures.push({ type: 'heading', content: trimmed, level: 2 });
        continue;
      }
      
      // Detect list items
      if (/^[-•·]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed) || /^[a-z]\)\s/.test(trimmed)) {
        if (currentParagraph) {
          structures.push({ type: 'paragraph', content: currentParagraph.trim() });
          currentParagraph = '';
        }
        structures.push({ type: 'list', content: trimmed });
        continue;
      }
      
      // Detect code or technical content (contains special chars, brackets, etc.)
      if (/[{}\[\]<>]/.test(trimmed) || /^\s{4,}/.test(line)) {
        if (currentParagraph) {
          structures.push({ type: 'paragraph', content: currentParagraph.trim() });
          currentParagraph = '';
        }
        structures.push({ type: 'code', content: trimmed });
        continue;
      }
      
      // Regular paragraph content
      currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
    }
    
    if (currentParagraph) {
      structures.push({ type: 'paragraph', content: currentParagraph.trim() });
    }
    
    return structures;
  };

  // Highlight search terms in text
  const highlightSearchTerms = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part) => 
      regex.test(part) ? 
        `<mark class="bg-yellow-300/30 text-yellow-900 px-1 rounded">${part}</mark>` : 
        part
    ).join('');
  };

  const processedStructures = document ? processTextContent(document.content) : [];
  const hasSearchResults = searchTerm && document?.content.toLowerCase().includes(searchTerm.toLowerCase());

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
                    {/* Breadcrumb Navigation */}
                    {(currentPrimaryFolder || currentSubFolder) && (
                      <div className="flex items-center gap-1 mb-2 text-sm text-gray-500">
                        {onNavigateToCategories && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToCategories();
                                onClose();
                              }}
                              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                            >
                              <ArrowLeft size={14} />
                              Categories
                            </button>
                            <ChevronRight size={12} />
                          </>
                        )}
                        {currentPrimaryFolder && (
                          <>
                            {onNavigateToPrimaryFolder ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToPrimaryFolder();
                                  onClose();
                                }}
                                className="hover:text-blue-600 transition-colors"
                              >
                                {currentPrimaryFolder}
                              </button>
                            ) : (
                              <span>{currentPrimaryFolder}</span>
                            )}
                            {currentSubFolder && <ChevronRight size={12} />}
                          </>
                        )}
                        {currentSubFolder && <span>{currentSubFolder}</span>}
                      </div>
                    )}
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
                  {/* Text formatting toggle */}
                  <Button 
                    variant={showFormatted ? "primary" : "ghost"}
                    size="sm" 
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    onClick={() => setShowFormatted(!showFormatted)}
                    title={showFormatted ? "Switch to raw text view" : "Switch to formatted text view"}
                  >
                    <Type size={18} />
                  </Button>
                  
                  {/* Copy to clipboard */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 relative"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(document.content);
                        setShowCopySuccess(true);
                        setTimeout(() => setShowCopySuccess(false), 2000);
                      } catch (err) {
                        console.error('Failed to copy to clipboard');
                      }
                    }}
                    title="Copy document content to clipboard"
                  >
                    <Copy size={18} />
                  </Button>
                  
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
                    title="Download document as text file"
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
                          setShowCopySuccess(true);
                          setTimeout(() => setShowCopySuccess(false), 2000);
                        } catch (err) {
                          console.error('Failed to copy to clipboard');
                        }
                      }
                    }}
                    title="Share document"
                  >
                    <Share2 size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100" 
                    onClick={onClose}
                    title="Close document viewer"
                  >
                    <X size={18} />
                  </Button>
                </div>
                
                {/* Copy Success Notification */}
                <AnimatePresence>
                  {showCopySuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      className="absolute top-16 right-6 z-10"
                    >
                      <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
                        <Check size={16} />
                        Content copied to clipboard!
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Search Bar for Text Content - Show for all documents */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search within document..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {hasSearchResults && (
                  <p className="text-xs text-green-600 mt-1">
                    Found search term in document
                  </p>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                {isPDF ? (
                  <div className="flex flex-col items-center">
                    {/* Try to load PDF, fall back to text if it fails */}
                    <iframe
                      src={pdfUrl}
                      width="100%"
                      height="600px"
                      style={{ border: '1px solid #ddd', borderRadius: '8px' }}
                      title={document.title}
                      onLoad={() => {
                        console.log('PDF iframe loaded successfully');
                        setPdfLoadFailed(false);
                      }}
                      onError={() => {
                        console.error('PDF iframe failed to load');
                        setPdfLoadFailed(true);
                      }}
                    />
                    {!pdfLoadFailed && (
                      <p className="text-sm text-gray-600 mt-2">
                        PDF displayed using browser's native viewer
                      </p>
                    )}
                    {pdfLoadFailed && (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg w-full">
                        <p className="text-yellow-800 text-sm mb-2">
                          PDF file not available. Showing extracted text content:
                        </p>
                        <div className="prose prose-sm max-w-none bg-white p-4 rounded border max-h-96 overflow-y-auto">
                          {showFormatted ? (
                            <div className="space-y-4">
                              {processedStructures.map((structure, index) => {
                                const content = highlightSearchTerms(structure.content, searchTerm);
                                
                                switch (structure.type) {
                                  case 'heading':
                                    return (
                                      <h3 
                                        key={index} 
                                        className="text-lg font-bold text-black mt-6 mb-3 pb-2 border-b border-gray-200"
                                        dangerouslySetInnerHTML={{ __html: content }}
                                      />
                                    );
                                  case 'list':
                                    return (
                                      <div 
                                        key={index} 
                                        className="ml-4 text-black leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: content }}
                                      />
                                    );
                                  case 'code':
                                    return (
                                      <pre 
                                        key={index} 
                                        className="bg-gray-100 p-3 rounded-lg text-sm font-mono text-black overflow-x-auto"
                                        dangerouslySetInnerHTML={{ __html: content }}
                                      />
                                    );
                                  case 'paragraph':
                                  default:
                                    return (
                                      <p 
                                        key={index} 
                                        className="text-black leading-relaxed mb-4 text-justify"
                                        dangerouslySetInnerHTML={{ __html: content }}
                                      />
                                    );
                                }
                              })}
                            </div>
                          ) : (
                            <div 
                              className="whitespace-pre-wrap text-black leading-relaxed text-sm font-mono"
                              dangerouslySetInnerHTML={{ 
                                __html: highlightSearchTerms(document.content, searchTerm) 
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="prose prose-gray max-w-none max-h-[60vh] overflow-y-auto">
                    {showFormatted ? (
                      <div className="space-y-4">
                        {processedStructures.map((structure, index) => {
                          const content = highlightSearchTerms(structure.content, searchTerm);
                          
                          switch (structure.type) {
                            case 'heading':
                              return (
                                <h2 
                                  key={index} 
                                  className="text-xl font-bold text-black mt-8 mb-4 pb-2 border-b-2 border-blue-200"
                                  dangerouslySetInnerHTML={{ __html: content }}
                                />
                              );
                            case 'list':
                              return (
                                <div 
                                  key={index} 
                                  className="ml-6 text-black leading-relaxed text-base"
                                  dangerouslySetInnerHTML={{ __html: content }}
                                />
                              );
                            case 'code':
                              return (
                                <pre 
                                  key={index} 
                                  className="bg-gray-100 p-4 rounded-lg text-sm font-mono text-black overflow-x-auto border-l-4 border-blue-400"
                                  dangerouslySetInnerHTML={{ __html: content }}
                                />
                              );
                            case 'paragraph':
                            default:
                              return (
                                <p 
                                  key={index} 
                                  className="text-black leading-relaxed mb-6 text-base text-justify"
                                  dangerouslySetInnerHTML={{ __html: content }}
                                />
                              );
                          }
                        })}
                      </div>
                    ) : (
                      <div 
                        className="whitespace-pre-wrap text-black leading-relaxed text-base font-mono"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightSearchTerms(document.content, searchTerm) 
                        }}
                      />
                    )}
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