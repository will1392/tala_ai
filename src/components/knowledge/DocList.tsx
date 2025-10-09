import React, { useEffect, useRef } from 'react';
import { FileText, FileSpreadsheet, FileCode, FileType, Presentation, FileAudio } from 'lucide-react';
import type { Doc } from '../../types/knowledge';

type Props = {
  docs: Doc[];
  activeDocId: string | null;
  onSelect: (id: string) => void;
};

const getDocIcon = (type: Doc['type']) => {
  switch (type) {
    case 'Spreadsheet': return FileSpreadsheet;
    case 'Presentation': return Presentation;
    case 'Markdown': return FileCode;
    case 'PDF': return FileType;
    case 'Audio': return FileAudio;
    default: return FileText;
  }
};

export default function DocList({ docs, activeDocId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation with roving tabindex
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-doc]'));
    if (!items.length) return;
    const activeIdx = Math.max(0, items.findIndex((el) => el.dataset.doc === activeDocId));
    items.forEach((el, i) => el.tabIndex = i === activeIdx ? 0 : -1);

    function onKey(e: KeyboardEvent) {
      if (!['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)) return;
      
      const focused = document.activeElement as HTMLButtonElement | null;
      let idx = focused ? items.indexOf(focused) : activeIdx;
      
      if (e.key === 'Enter' || e.key === ' ') {
        // Space/Enter should activate the focused item
        if (focused && focused.dataset.doc) {
          e.preventDefault();
          onSelect(focused.dataset.doc);
        }
        return;
      }
      
      e.preventDefault();
      if (e.key === 'ArrowDown') idx = Math.min(items.length - 1, idx + 1);
      if (e.key === 'ArrowUp')   idx = Math.max(0, idx - 1);
      if (e.key === 'Home')      idx = 0;
      if (e.key === 'End')       idx = items.length - 1;
      
      // Update tabindex and focus
      items.forEach((el, i) => el.tabIndex = i === idx ? 0 : -1);
      items[idx]?.focus();
    }
    container.addEventListener('keydown', onKey);
    return () => container.removeEventListener('keydown', onKey);
  }, [docs, activeDocId, onSelect]);

  if (docs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <FileText size={48} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">No documents found</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} role="listbox" aria-label="Document list" className="space-y-2">
      {docs.map((d, index) => {
        const Icon = getDocIcon(d.type);
        const isSelected = activeDocId === d.id;
        return (
          <button
            key={d.id}
            data-doc={d.id}
            role="option"
            aria-selected={isSelected}
            aria-label={`${d.title}, ${d.type}, updated ${d.updated}`}
            onClick={() => onSelect(d.id)}
            className={`w-full text-left px-3 py-3 flex items-start gap-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              isSelected 
                ? 'bg-primary/10 ring-2 ring-primary/30' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Icon size={20} className="shrink-0 mt-0.5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{d.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1" aria-hidden="true">
                {d.type} • Updated {d.updated}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}