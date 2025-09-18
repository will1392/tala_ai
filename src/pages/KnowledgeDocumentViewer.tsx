import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Tag, Hash, Loader2 } from 'lucide-react';
import type { Doc } from '../types/knowledge';

const formatFileSize = (bytes: number | undefined) => {
  if (!bytes || Number.isNaN(bytes)) return 'Unknown size';
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${Math.round(kilobytes)} KB`;
  }
  return `${(kilobytes / 1024).toFixed(1)} MB`;
};

const getDocType = (fileType?: string): Doc['type'] => {
  const normalized = fileType?.toLowerCase() || '';
  if (normalized.includes('pdf')) return 'PDF';
  if (normalized.includes('spreadsheet') || normalized.includes('excel') || normalized.includes('xlsx')) {
    return 'Spreadsheet';
  }
  if (normalized.includes('presentation') || normalized.includes('powerpoint') || normalized.includes('ppt')) {
    return 'Presentation';
  }
  if (normalized.includes('markdown') || normalized.includes('md')) {
    return 'Markdown';
  }
  return 'Document';
};

const formatRelativeTime = (timestamp?: string | Date | null) => {
  if (!timestamp) return 'Recently updated';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recently updated';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
};

const parseMetadata = (metadata: unknown): Record<string, any> | undefined => {
  if (!metadata) return undefined;
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch (error) {
      console.warn('Failed to parse metadata JSON:', error);
      return undefined;
    }
  }
  if (typeof metadata === 'object') {
    return metadata as Record<string, any>;
  }
  return undefined;
};

const KnowledgeDocumentViewer: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { document?: Doc } | undefined;
  const [document, setDocument] = useState<Doc | null>(locationState?.document ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!docId) return;

      console.log('🔍 KnowledgeDocumentViewer - docId received:', docId);

      try {
        setLoading(true);
        setError(null);

        const storedUserId = localStorage.getItem('userId');
        const userId = storedUserId || '59b70373-ba68-4d89-8420-5c3723aef01f';
        const organizationId = localStorage.getItem('organizationId') || '00000000-0000-0000-0000-000000000001';
        const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-organization-id': organizationId
        };

        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
          method: 'GET',
          headers
        });

        if (response.status === 404) {
          throw new Error('Document not found');
        }

        if (!response.ok) {
          const details = await response.json().catch(() => null);
          const message = details?.message || response.statusText || 'Failed to load document';
          throw new Error(message);
        }

        const rawData = await response.json();
        const documentData = rawData?.data || rawData;

        if (!documentData || !documentData.id) {
          throw new Error('Document not found');
        }

        const metadata = parseMetadata(documentData.metadata) || {};
        const doc: Doc = {
          id: documentData.id,
          folderId: documentData.folder_id || metadata.folderId || 'uncategorized',
          type: getDocType(documentData.file_type || documentData.mime_type),
          title: documentData.title || metadata.originalName || documentData.file_name || 'Untitled document',
          updated: formatRelativeTime(documentData.updated_at || documentData.created_at),
          content: documentData.content || documentData.content_preview || '',
          previewUrl: documentData.file_url || metadata.fileUrl,
          metadata: {
            ...metadata,
            fileSize: documentData.file_size ?? metadata.fileSize,
            fileUrl: documentData.file_url ?? metadata.fileUrl,
            mimeType: documentData.mime_type ?? metadata.mimeType,
            originalName: documentData.file_name ?? metadata.originalName
          }
        };

        setDocument(doc);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [docId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1220] via-[#101a2d] to-[#0B1220] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Loading document</h1>
            <p className="text-white/70">
              Retrieving your knowledge base document...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1220] via-[#101a2d] to-[#0B1220] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <FileText className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Document not found</h1>
            <p className="text-white/70">
              {error || "We couldn't locate that knowledge base document. It may have been removed or you followed an outdated link."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              Return to previous page
            </button>
            <Link
              to="/knowledge"
              className="px-4 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 transition-colors"
            >
              Browse knowledge workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070B18] via-[#0F1B2F] to-[#070B18] text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to previous page
        </button>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-6 py-6 md:px-10 md:py-10 space-y-8">
            <header className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs uppercase tracking-wide">
                {document.type}
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                {document.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  {document.type.toUpperCase()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  {document.updated}
                </span>
              </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50">File size</p>
                <p className="mt-2 text-lg font-semibold">{formatFileSize(document.metadata?.fileSize)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50">Document type</p>
                <p className="mt-2 text-lg font-semibold">{document.type}</p>
              </div>
            </section>

            {document.metadata?.excerpt && (
              <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                  <Tag className="w-5 h-5" aria-hidden="true" />
                  Document preview
                </h2>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {document.metadata.excerpt}
                </p>
              </section>
            )}

            {document.content && (
              <section className="rounded-2xl border border-white/10 bg-black/30 p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" aria-hidden="true" />
                  Full document
                </h2>
                <div className="max-h-[60vh] overflow-y-auto pr-2 text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                  {document.content}
                </div>
              </section>
            )}


            <footer className="flex flex-wrap items-center gap-3 justify-between">
              <div className="text-xs text-white/50">
                Tala AI knowledge base document · {document.id}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/knowledge"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm"
                >
                  Open knowledge workspace
                </Link>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 transition-colors text-sm"
                >
                  Return to chat
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeDocumentViewer;