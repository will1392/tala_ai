import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, FolderPlus, Folder as FolderIcon, Trash2 } from 'lucide-react';
import type { FolderNode } from '../../types/knowledge';

type Props = {
  root: FolderNode[];                    // top-level folders
  activeId: string | null;               // currently selected folder
  onSelect: (id: string | null) => void;
  onCreateSubfolder: (parentId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  isAdmin?: boolean;
};

function NodeRow({
  node, depth, activeId, onSelect, onCreateSubfolder, onDeleteFolder, isAdmin,
}: {
  node: FolderNode; depth: number;
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!node.children?.length;
  const buttonRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' && hasChildren && !open) {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === 'ArrowLeft' && hasChildren && open) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(node.id);
    }
  };

  return (
    <div 
      role="treeitem" 
      aria-expanded={hasChildren ? open : undefined}
      aria-selected={activeId === node.id}
      aria-level={depth}
      aria-setsize={node.children?.length || 0}
    >
      <div
        ref={buttonRef}
        className={`group flex items-center justify-between rounded-lg px-2 py-1 transition-colors ${
          activeId === node.id 
            ? 'bg-primary/10 text-primary' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        } focus-within:ring-2 focus-within:ring-primary/50`}
        style={{ paddingLeft: depth * 14 }}
        tabIndex={activeId === node.id ? 0 : -1}
        onKeyDown={handleKeyDown}
        onClick={() => onSelect(node.id)}
        aria-label={`${node.name} folder`}
      >
        <div className="flex items-center gap-2 flex-1">
          {hasChildren ? (
            <button
              aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
              tabIndex={-1}
            >
              <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
            </button>
          ) : <span className="w-4" aria-hidden="true" />}
          <FolderIcon size={14} aria-hidden="true" />
          <span className="text-sm">{node.name}</span>
        </div>

        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              aria-label={`Create subfolder in ${node.name}`}
              onClick={(e) => { e.stopPropagation(); onCreateSubfolder(node.id); }}
              className="p-1.5 rounded hover:bg-primary/10 dark:hover:bg-primary/20 opacity-100 transition-all hover:scale-110"
              tabIndex={-1}
              title="Create subfolder"
            >
              <FolderPlus size={16} className="text-primary" aria-hidden="true" />
            </button>
          )}
          {isAdmin && onDeleteFolder && (
            <button
              aria-label={`Delete ${node.name} folder`}
              onClick={(e) => { e.stopPropagation(); onDeleteFolder(node.id); }}
              className="p-1.5 rounded hover:bg-red-500/10 dark:hover:bg-red-500/20 opacity-100 transition-all hover:scale-110"
              tabIndex={-1}
              title="Delete folder"
            >
              <Trash2 size={16} className="text-red-500" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {hasChildren && open && (
        <div role="group" aria-label={`${node.name} subfolders`}>
          {node.children!.map(child => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onSelect={onSelect}
              onCreateSubfolder={onCreateSubfolder}
              onDeleteFolder={onDeleteFolder}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderTreeRecursive({ root, activeId, onSelect, onCreateSubfolder, onDeleteFolder, isAdmin }: Props) {
  const treeRef = useRef<HTMLElement>(null);

  // Keyboard navigation for the tree
  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const focusedElement = document.activeElement as HTMLElement;
      if (!tree.contains(focusedElement)) return;

      const allItems = Array.from(tree.querySelectorAll('[role="treeitem"][tabindex="0"], [role="treeitem"][tabindex="-1"]')) as HTMLElement[];
      const currentIndex = allItems.indexOf(focusedElement);

      let nextIndex = currentIndex;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = Math.min(currentIndex + 1, allItems.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = Math.max(currentIndex - 1, 0);
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = allItems.length - 1;
      } else {
        return;
      }

      // Update tabindex and focus
      allItems.forEach((item, index) => {
        item.tabIndex = index === nextIndex ? 0 : -1;
      });
      allItems[nextIndex]?.focus();
    };

    tree.addEventListener('keydown', handleKeyDown);
    return () => tree.removeEventListener('keydown', handleKeyDown);
  }, [root, activeId]);

  return (
    <nav ref={treeRef} aria-label="Folder navigation tree" role="tree" className="space-y-1">
      <div
        role="treeitem"
        tabIndex={activeId === null ? 0 : -1}
        onClick={() => onSelect(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(null);
          }
        }}
        className={`w-full text-left px-3 py-2 rounded-lg transition-colors focus:ring-2 focus:ring-primary/50 outline-none ${
          activeId === null 
            ? 'bg-primary/10 text-primary font-medium' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        aria-selected={activeId === null}
        aria-label="All Documents"
      >
        All Documents
      </div>
      {root.map(node => (
        <div key={node.id} className="group">
          <NodeRow
            node={node}
            depth={1}
            activeId={activeId}
            onSelect={onSelect}
            onCreateSubfolder={onCreateSubfolder}
            onDeleteFolder={onDeleteFolder}
            isAdmin={isAdmin}
          />
        </div>
      ))}
    </nav>
  );
}