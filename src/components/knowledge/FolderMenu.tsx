import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../shared/Button';

interface FolderMenuProps {
  folderId: string;
  folderName: string;
  onEdit: () => void;
  onDelete: () => void;
}

export const FolderMenu = ({ folderId, folderName, onEdit, onDelete }: FolderMenuProps) => {
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
    console.log('Menu clicked, current state:', isOpen);
    
    if (buttonRef.current && !isOpen) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.top - 80, // Position above the button
        left: rect.left - 50
      });
    }
    
    setIsOpen(!isOpen);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onDelete();
  };

  return (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className="p-1 h-6 w-6 hover:bg-white/10"
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
            minWidth: '120px'
          }}
        >
          <div className="bg-gray-900 rounded-lg border border-white/10 p-1 shadow-xl">
              <button
                onClick={handleEdit}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 rounded-md transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </button>
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