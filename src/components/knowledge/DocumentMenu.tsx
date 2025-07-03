import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Trash2, FolderOpen, Edit2 } from 'lucide-react';
import { Button } from '../shared/Button';

interface DocumentMenuProps {
  documentId: string;
  documentTitle?: string;
  currentFolderId?: string;
  onDelete?: (documentId: string) => void;
  onMove?: (documentId: string) => void;
  onEdit?: () => void;
}

export const DocumentMenu = ({ 
  documentId, 
  onDelete, 
  onMove,
  onEdit 
}: DocumentMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (buttonRef.current && !isOpen) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.top - 100, // Position above the button
        left: rect.left - 80
      });
    }
    
    setIsOpen(!isOpen);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onDelete?.(documentId);
  };

  const handleMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onMove?.(documentId);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onEdit?.();
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className="p-1 h-6 w-6 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleMenuClick}
      >
        <MoreVertical size={14} />
      </Button>

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          className="fixed z-[9999]"
          style={{ 
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            minWidth: '140px'
          }}
        >
          <div className="bg-gray-900 rounded-lg border border-white/10 p-1 shadow-xl">
            <button
              onClick={handleMove}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 rounded-md transition-colors text-white"
            >
              <FolderOpen size={14} />
              Move to Folder
            </button>
            {onEdit && (
              <button
                onClick={handleEdit}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 rounded-md transition-colors text-white"
              >
                <Edit2 size={14} />
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/20 text-red-400 rounded-md transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};