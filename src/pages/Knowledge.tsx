import React, { useMemo, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import FolderTree from '../components/knowledge/FolderTree';
import SearchBar from '../components/knowledge/SearchBar';
import DocList from '../components/knowledge/DocList';
import DocPreview from '../components/knowledge/DocPreview';
import type { Folder, Doc } from '../types/knowledge';

const FOLDERS: Folder[] = [
  { id: 'reports', name: 'Reports' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'finance', name: 'Finance' },
  { id: 'ideas', name: 'Ideas' },
  { id: 'travel', name: 'Travel Guides' },
  { id: 'templates', name: 'Templates' },
];

const DOCS: Doc[] = [
  { id: '1', title: 'Q1 Financials.xlsx', folder: 'finance', type: 'Spreadsheet',  updated: '2h ago' },
  { id: '2', title: 'Marketing Plan 2025.docx', folder: 'marketing', type: 'Document', updated: 'today' },
  { id: '3', title: 'Iberia Beaches Guide.md', folder: 'travel', type: 'Markdown', updated: 'yesterday' },
  { id: '4', title: 'AI Presentation.pptx', folder: 'ideas', type: 'Presentation', updated: '4d ago' },
  { id: '5', title: 'Annual Report 2024.pdf', folder: 'reports', type: 'PDF', updated: '1w ago' },
  { id: '6', title: 'Social Media Strategy.docx', folder: 'marketing', type: 'Document', updated: '2d ago' },
  { id: '7', title: 'Budget Template.xlsx', folder: 'templates', type: 'Spreadsheet', updated: '5d ago' },
  { id: '8', title: 'Greece Travel Guide.pdf', folder: 'travel', type: 'PDF', updated: '3d ago' },
  { id: '9', title: 'Q2 Projections.xlsx', folder: 'finance', type: 'Spreadsheet', updated: '1d ago' },
  { id: '10', title: 'Product Roadmap.md', folder: 'ideas', type: 'Markdown', updated: 'today' },
];

export const Knowledge = () => {
  const [q, setQ] = useState('');
  const [folderId, setFolderId] = useState<string|null>(null);
  const [activeId, setActiveId] = useState<string|null>('3');
  const [showRightPanel, setShowRightPanel] = useState(true);

  const filtered = useMemo(() => {
    return DOCS.filter(d =>
      (!folderId || d.folder === folderId) &&
      d.title.toLowerCase().includes(q.toLowerCase())
    );
  }, [q, folderId]);

  const activeDoc = filtered.find(d => d.id === activeId) || null;

  const handleUpload = () => {
    alert('Upload modal would open here');
  };

  const handleUseInChat = (doc: Doc) => {
    console.log('Use in chat:', doc);
    alert(`Opening "${doc.title}" in chat`);
  };

  const handleRemoveDoc = (doc: Doc) => {
    console.log('Remove doc:', doc);
    if (confirm(`Remove "${doc.title}"?`)) {
      alert('Document removed (mock)');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.history.back()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold">Knowledge Workspace</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {showRightPanel ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Folder Tree */}
        <aside className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 font-semibold">
              Folders
            </h2>
            <FolderTree 
              folders={FOLDERS} 
              activeFolderId={folderId} 
              onSelect={setFolderId} 
            />
          </div>

          {/* Tags Section (Optional) */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 font-semibold">
              Popular Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {['Important', 'Q1-2025', 'Review', 'Draft'].map(tag => (
                <button
                  key={tag}
                  className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Panel - Search & Document List */}
        <main className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <SearchBar 
              value={q} 
              onChange={setQ} 
              onUpload={handleUpload} 
            />
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {filtered.length} {filtered.length === 1 ? 'document' : 'documents'}
                {folderId && ` in ${FOLDERS.find(f => f.id === folderId)?.name}`}
              </h2>
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Clear search
                </button>
              )}
            </div>
            <DocList 
              docs={filtered} 
              activeDocId={activeId} 
              onSelect={setActiveId} 
            />
          </div>
        </main>

        {/* Right Panel - Document Preview (Collapsible) */}
        {showRightPanel && (
          <aside className="w-96 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto">
            <DocPreview 
              doc={activeDoc} 
              onUseInChat={handleUseInChat} 
              onRemove={handleRemoveDoc}
              onClose={() => setShowRightPanel(false)}
            />
          </aside>
        )}
      </div>
    </div>
  );
};