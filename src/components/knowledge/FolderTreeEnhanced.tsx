import React from 'react';
import { Folder as FolderIcon, ChevronRight, ChevronDown } from 'lucide-react';

export type FolderNode = {
  id: string;
  name: string;
  type: 'primary' | 'subfolder';
  parentId?: string;
  children?: FolderNode[];
  documentCount?: number;
};

type Props = {
  folders: FolderNode[];
  activeFolderId: string | null;
  expandedFolders: Set<string>;
  onSelect: (id: string | null) => void;
  onToggleExpand: (id: string) => void;
};

export default function FolderTreeEnhanced({ 
  folders, 
  activeFolderId, 
  expandedFolders,
  onSelect,
  onToggleExpand 
}: Props) {
  
  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const isActive = activeFolderId === folder.id;
    
    return (
      <div key={folder.id}>
        <button
          role="treeitem"
          aria-selected={isActive}
          onClick={() => onSelect(folder.id)}
          className={`w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            isActive 
              ? 'bg-primary/10 text-primary font-medium' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder.id);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          <FolderIcon size={16} className="shrink-0" />
          <span className="truncate flex-1">{folder.name}</span>
          {folder.documentCount !== undefined && folder.documentCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {folder.documentCount}
            </span>
          )}
        </button>
        
        {hasChildren && isExpanded && (
          <div>
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <nav aria-label="Folders" className="space-y-0.5" role="tree">
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
      
      {folders.map(folder => renderFolder(folder))}
    </nav>
  );
}