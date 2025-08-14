import React from 'react';
import { Folder as FolderIcon } from 'lucide-react';
import type { Folder } from '../../types/knowledge';

type Props = {
  folders: Folder[];
  activeFolderId: string | null;
  onSelect: (id: string | null) => void;
};

export default function FolderTree({ folders, activeFolderId, onSelect }: Props) {
  return (
    <nav aria-label="Folders" className="space-y-1" role="tree">
      <button
        role="treeitem"
        aria-selected={activeFolderId === null}
        onClick={() => onSelect(null)}
        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
          activeFolderId === null 
            ? 'bg-primary/10 text-primary font-medium' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        All Documents
      </button>
      {folders.map(f => (
        <button
          key={f.id}
          role="treeitem"
          aria-selected={activeFolderId === f.id}
          onClick={() => onSelect(f.id)}
          className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            activeFolderId === f.id 
              ? 'bg-primary/10 text-primary font-medium' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <FolderIcon size={16} className="shrink-0" />
          <span className="truncate">{f.name}</span>
        </button>
      ))}
    </nav>
  );
}