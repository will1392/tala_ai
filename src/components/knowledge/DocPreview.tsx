import React from 'react';
import { BookOpen, CheckCircle2, Trash2, X, Tag, Link2, Calendar } from 'lucide-react';
import type { Doc } from '../../types/knowledge';

type Props = {
  doc: Doc | null;
  onUseInChat?: (doc: Doc) => void;
  onRemove?: (doc: Doc) => void;
  onClose?: () => void;
};

export default function DocPreview({ doc, onUseInChat, onRemove, onClose }: Props) {
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-primary" />
          <span className="font-semibold">Document Preview</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Document Info */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">{doc.title}</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Tag size={14} />
                {doc.type}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                Updated {doc.updated}
              </span>
            </div>
          </div>

          {/* Preview Content */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-sm font-medium mb-3">Document Summary</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p>This is a preview of the document content. In a real implementation, this would show:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Auto-generated summary of key points</li>
                <li>Extracted entities and topics</li>
                <li>Related documents and references</li>
                <li>Confidence scores and source metadata</li>
              </ul>
            </div>
          </div>

          {/* Tags/Metadata */}
          <div>
            <h3 className="text-sm font-medium mb-2">Tags & Metadata</h3>
            <div className="flex flex-wrap gap-2">
              {['Important', 'Reviewed', 'Q1-2025'].map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Related Links */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Link2 size={14} />
              Related Documents
            </h3>
            <div className="space-y-1">
              <button className="text-sm text-primary hover:underline text-left">
                → Similar analysis from last quarter
              </button>
              <button className="text-sm text-primary hover:underline text-left">
                → Parent folder contents
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <button
          onClick={() => doc && onUseInChat?.(doc)}
          className="flex-1 rounded-xl bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} />
          Use in Chat
        </button>
        <button
          onClick={() => doc && onRemove?.(doc)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm hover:border-red-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={16} />
          Remove
        </button>
      </div>
    </div>
  );
}