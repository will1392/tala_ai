import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Download,
  Copy,
  Check,
  Clock,
  Folder,
  X,
  Loader2,
  Eye,
  Search,
  ChevronRight,
  Share2
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { ApiSearchService } from '../../services/apiSearchService';

interface Document {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  fileType?: string;
  fileUrl?: string;
  uploadedAt?: string | Date;
  category?: string;
  metadata?: any;
}

interface DocumentExplorerProps {
  folderId: string;
  folderName: string;
  primaryFolderId?: string;
  onBack: () => void;
  initialDocuments?: Document[];
}

// Premium UI Components
const Button = ({ 
  children, 
  variant = "default",
  size = "default",
  className = "",
  ...props
}: { 
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  [key: string]: any;
}) => {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline"
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-2xl px-3",
    lg: "h-11 rounded-2xl px-8",
    icon: "h-10 w-10"
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-3xl border bg-card text-card-foreground shadow-sm backdrop-blur-sm", className)}>
    {children}
  </div>
)

const Input = ({ className = "", ...props }: { className?: string; [key: string]: any }) => (
  <input
    className={cn(
      "flex h-10 w-full rounded-2xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
)

export const DocumentExplorer: React.FC<DocumentExplorerProps> = ({
  folderId,
  folderName,
  primaryFolderId,
  onBack,
  initialDocuments = []
}) => {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const apiService = new ApiSearchService();

  // Load documents on mount if not provided
  useEffect(() => {
    if (initialDocuments.length === 0) {
      loadDocuments();
    } else {
      setLoading(false);
      setFilteredDocuments(initialDocuments);
      // Select first document by default
      if (initialDocuments.length > 0) {
        setSelectedDocument(initialDocuments[0]);
      }
    }
  }, []);

  // Load documents from API
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const result = await apiService.getDocuments(
        'admin-1',
        true,
        folderId,
        100, // Get more documents for sidebar
        0,
        primaryFolderId
      );
      setDocuments(result.documents);
      setFilteredDocuments(result.documents);
      
      // Select first document by default
      if (result.documents.length > 0) {
        setSelectedDocument(result.documents[0]);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
      setFilteredDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load document content when selected
  useEffect(() => {
    if (selectedDocument) {
      loadDocumentContent(selectedDocument);
    }
  }, [selectedDocument]);

  // Load full document content
  const loadDocumentContent = async (doc: Document) => {
    setLoadingContent(true);
    setSignedUrl(null);
    
    try {
      // Check if it's a PDF or other file with URL
      if (doc.fileType === 'application/pdf' && doc.fileUrl) {
        // Fetch signed URL if needed
        setLoadingUrl(true);
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/documents/${doc.id}/url?userId=admin-1&isAdmin=true`
          );
          
          if (response.ok) {
            const data = await response.json();
            setSignedUrl(data.url);
          } else {
            console.error('Failed to fetch signed URL:', response.status, response.statusText);
            setSignedUrl(doc.fileUrl); // Fallback to original URL
          }
        } catch (error) {
          console.error('Error fetching signed URL:', error);
          setSignedUrl(doc.fileUrl); // Fallback to original URL
        } finally {
          setLoadingUrl(false);
        }
      } else {
        // For text documents, use the content
        const content = doc.content || doc.excerpt || 'No content available';
        setDocumentContent(content);
      }
    } catch (error) {
      console.error('Failed to load document content:', error);
      setDocumentContent('Failed to load document content');
    } finally {
      setLoadingContent(false);
    }
  };

  // Filter documents based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = documents.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        (doc.excerpt && doc.excerpt.toLowerCase().includes(query))
      );
      setFilteredDocuments(filtered);
    }
  }, [searchQuery, documents]);

  // Copy content to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(documentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download document
  const handleDownload = async () => {
    if (!selectedDocument) return;
    
    // For PDFs with URLs, open in new tab
    if (selectedDocument.fileType === 'application/pdf' && signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      // For text content, download as text file
      const blob = new Blob([documentContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDocument.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Share document
  const handleShare = async () => {
    if (!selectedDocument) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedDocument.title,
          text: documentContent,
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      handleCopy();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-80 border-r border-border/50 bg-background/95 backdrop-blur-sm flex flex-col"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-3 -ml-2"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to folders
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <Folder className="w-6 h-6 text-muted-foreground" />
            <div>
              <h2 className="font-semibold text-lg">{folderName}</h2>
              <p className="text-sm text-muted-foreground">
                {filteredDocuments.length} documents
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-10 h-9"
            />
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No documents match your search' : 'No documents in this folder'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredDocuments.map((doc) => (
                <motion.button
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className={cn(
                    "w-full text-left p-3 rounded-2xl mb-2 transition-all",
                    "hover:bg-accent/50",
                    selectedDocument?.id === doc.id && "bg-accent"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <FileText className={cn(
                      "w-4 h-4 mt-0.5 flex-shrink-0",
                      doc.fileType === 'application/pdf' ? "text-red-500" : "text-muted-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate mb-1">
                        {doc.title}
                      </h3>
                      {doc.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {doc.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(doc.uploadedAt || new Date()).toLocaleDateString()}
                        </span>
                        {doc.fileType === 'application/pdf' && (
                          <span className="text-red-500 font-medium">PDF</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedDocument ? (
          <>
            {/* Document Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="border-b border-border/50 bg-background/95 backdrop-blur-sm"
            >
              <div className="px-8 py-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-2">{selectedDocument.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(selectedDocument.uploadedAt || new Date()).toLocaleDateString()}
                      </span>
                      {selectedDocument.category && (
                        <span className="capitalize">{selectedDocument.category}</span>
                      )}
                      {selectedDocument.fileType && (
                        <span className="capitalize">{selectedDocument.fileType}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedDocument.fileType !== 'application/pdf' && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopy}
                        className="rounded-xl"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <Check size={16} className="text-green-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleShare}
                      className="rounded-xl"
                      title="Share document"
                    >
                      <Share2 size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDownload}
                      className="rounded-xl"
                      title={selectedDocument.fileType === 'application/pdf' ? "Open PDF in new tab" : "Download document"}
                    >
                      <Download size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto bg-background">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="px-8 py-6 h-full"
              >
                {loadingContent || loadingUrl ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {loadingUrl ? 'Loading secure document...' : 'Loading content...'}
                      </p>
                    </div>
                  </div>
                ) : selectedDocument?.fileType === 'application/pdf' && signedUrl ? (
                  // Display PDF in iframe
                  <div className="h-full">
                    <Card className="h-full bg-card/50 p-4">
                      <iframe
                        src={signedUrl}
                        className="w-full h-full rounded-xl border border-border/50"
                        title={selectedDocument.title}
                      />
                    </Card>
                  </div>
                ) : (
                  // Display text content
                  <div className="max-w-4xl mx-auto">
                    <Card className="p-8 bg-card/50">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-card-foreground leading-relaxed">
                          {documentContent}
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Eye className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a document to view</h3>
              <p className="text-muted-foreground">
                Choose a document from the sidebar to start reading
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};