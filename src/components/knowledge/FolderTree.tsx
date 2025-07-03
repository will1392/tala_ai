import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  FolderOpen, 
  Plus
} from 'lucide-react';
import { Button } from '../shared/Button';
import { FolderMenu } from './FolderMenu';
import { cn } from '../../utils/cn';
import type { PrimaryFolder } from '../../types/primaryFolder';
import type { Folder as FolderType } from '../../services/folderService';

interface FolderNode {
  id: string;
  name: string;
  type: 'primary' | 'subfolder';
  parentId?: string;
  documentCount: number;
  subFolderCount?: number;
  color?: string;
  icon?: string;
  children: FolderNode[];
  isExpanded?: boolean;
}

interface FolderTreeProps {
  primaryFolders: PrimaryFolder[];
  folders: FolderType[];
  selectedFolderId?: string;
  selectedPrimaryFolderId?: string;
  onFolderSelect: (folderId: string, type: 'primary' | 'subfolder') => void;
  onCreateSubfolder: (parentId: string, type: 'primary' | 'subfolder') => void;
  onEditFolder: (folder: FolderType) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onMoveFolder?: (folderId: string, newParentId: string, newParentType: 'primary' | 'subfolder') => void;
  canCreateFolders?: boolean;
  enableDragDrop?: boolean;
  className?: string;
}

export const FolderTree = ({
  primaryFolders,
  folders,
  selectedFolderId,
  selectedPrimaryFolderId,
  onFolderSelect,
  onCreateSubfolder,
  onEditFolder,
  onDeleteFolder,
  onMoveFolder,
  canCreateFolders = true,
  enableDragDrop = true,
  className
}: FolderTreeProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<FolderNode | null>(null);
  const [dragOverNode, setDragOverNode] = useState<string | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Build hierarchical tree structure
  const buildTreeStructure = (): FolderNode[] => {
    const tree: FolderNode[] = [];
    
    // Add primary folders as root nodes
    primaryFolders.forEach(primaryFolder => {
      const primaryNode: FolderNode = {
        id: primaryFolder.id,
        name: primaryFolder.name,
        type: 'primary',
        documentCount: primaryFolder.documentCount,
        subFolderCount: primaryFolder.subFolderCount,
        color: primaryFolder.color,
        icon: primaryFolder.icon,
        children: [],
        isExpanded: expandedNodes.has(primaryFolder.id)
      };

      // Add subfolders that belong to this primary folder
      const subfolders = folders.filter(folder => folder.primaryFolderId === primaryFolder.id);
      subfolders.forEach(subfolder => {
        primaryNode.children.push({
          id: subfolder.id,
          name: subfolder.name,
          type: 'subfolder',
          parentId: primaryFolder.id,
          documentCount: subfolder.documentCount || 0,
          children: [],
          isExpanded: expandedNodes.has(subfolder.id)
        });
      });

      tree.push(primaryNode);
    });

    return tree;
  };

  const toggleExpanded = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleFolderClick = (node: FolderNode) => {
    onFolderSelect(node.id, node.type);
  };

  const handleCreateSubfolder = (parentId: string, type: 'primary' | 'subfolder', event: React.MouseEvent) => {
    event.stopPropagation();
    onCreateSubfolder(parentId, type);
  };

  // Drag and Drop Handlers
  const handleDragStart = (node: FolderNode, event: React.DragEvent) => {
    if (!enableDragDrop || node.type === 'primary') return; // Only allow dragging subfolders
    
    event.stopPropagation();
    setDraggedNode(node);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', node.id);
  };

  const handleDragEnd = (event: React.DragEvent) => {
    event.stopPropagation();
    setDraggedNode(null);
    setDragOverNode(null);
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  const handleDragOver = (node: FolderNode, event: React.DragEvent) => {
    if (!enableDragDrop || !draggedNode || draggedNode.id === node.id) return;
    
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    
    setDragOverNode(node.id);
    
    // Auto-expand nodes when hovering during drag
    if (node.children.length > 0 && !expandedNodes.has(node.id)) {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      dragTimeoutRef.current = setTimeout(() => {
        setExpandedNodes(prev => new Set([...prev, node.id]));
      }, 1000);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.stopPropagation();
    setDragOverNode(null);
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  const handleDrop = (targetNode: FolderNode, event: React.DragEvent) => {
    if (!enableDragDrop || !draggedNode || !onMoveFolder) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Prevent dropping on itself or invalid targets
    if (draggedNode.id === targetNode.id) return;
    if (draggedNode.type === 'primary') return; // Can't move primary folders
    
    // Execute the move
    onMoveFolder(draggedNode.id, targetNode.id, targetNode.type);
    
    // Cleanup
    setDraggedNode(null);
    setDragOverNode(null);
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  const renderNode = (node: FolderNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isSelected = node.type === 'primary' 
      ? selectedPrimaryFolderId === node.id 
      : selectedFolderId === node.id;
    const isExpanded = expandedNodes.has(node.id);
    const isDragging = draggedNode?.id === node.id;
    const isDragOver = dragOverNode === node.id;
    const canDrag = enableDragDrop && node.type === 'subfolder';

    return (
      <div key={node.id} className="select-none">
        {/* Node Content */}
        <div
          className={cn(
            "group flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all hover:bg-white/5",
            isSelected && "bg-primary/20 border border-primary/30",
            !isSelected && "hover:bg-white/10",
            isDragging && "opacity-50 scale-95",
            isDragOver && "bg-blue-500/20 border-2 border-blue-500/50"
          )}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => handleFolderClick(node)}
          draggable={canDrag}
          onDragStart={(e) => handleDragStart(node, e)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(node, e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(node, e)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) => toggleExpanded(node.id, e)}
              className="w-4 h-4 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-white/70" />
              ) : (
                <ChevronRight size={14} className="text-white/70" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4" /> // Spacer for alignment
          )}

          {/* Folder Icon */}
          <div className="flex items-center justify-center w-5 h-5">
            {node.type === 'primary' ? (
              <div 
                className="w-4 h-4 rounded flex items-center justify-center text-xs"
                style={{ 
                  backgroundColor: `${node.color}40`, 
                  color: node.color 
                }}
              >
                📁
              </div>
            ) : hasChildren && isExpanded ? (
              <FolderOpen size={16} className="text-blue-400" />
            ) : (
              <Folder size={16} className="text-blue-400" />
            )}
          </div>

          {/* Folder Name and Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white truncate text-sm">
                {node.name}
              </span>
              <span className="text-xs text-white/50 flex-shrink-0">
                ({node.documentCount})
              </span>
            </div>
            {node.type === 'primary' && node.subFolderCount && node.subFolderCount > 0 && (
              <div className="text-xs text-white/40">
                {node.subFolderCount} subfolder{node.subFolderCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canCreateFolders && (
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6"
                onClick={(e) => handleCreateSubfolder(node.id, node.type, e)}
                title={`Add subfolder to ${node.name}`}
              >
                <Plus size={12} />
              </Button>
            )}
            
            {node.type === 'subfolder' && (
              <FolderMenu
                onEdit={() => {
                  const folder = folders.find(f => f.id === node.id);
                  if (folder) onEditFolder(folder);
                }}
                onDelete={() => {
                  const folder = folders.find(f => f.id === node.id);
                  if (folder) onDeleteFolder(folder);
                }}
              />
            )}
          </div>
        </div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {node.children.map(child => renderNode(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const treeData = buildTreeStructure();

  return (
    <div className={cn("space-y-1", className)}>
      {treeData.map(node => renderNode(node))}
      
      {/* Empty State */}
      {treeData.length === 0 && (
        <div className="text-center py-8 text-white/50">
          <Folder size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No folders available</p>
        </div>
      )}
    </div>
  );
};