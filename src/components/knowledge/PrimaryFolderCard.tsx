import { motion } from 'framer-motion';
import { 
  MapPin, Building, FileText, Megaphone, Archive, Folder, 
  Briefcase, Globe, Plane, Car, Home, Calendar, Users, 
  Settings, Star, Heart, Shield, Camera, Music, Video,
  MoreVertical, Edit, Trash2, Eye, EyeOff
} from 'lucide-react';
import { useState } from 'react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';
import type { PrimaryFolder } from '../../types/primaryFolder';

interface PrimaryFolderCardProps {
  primaryFolder: PrimaryFolder;
  isAdmin: boolean;
  onClick?: () => void;
  onEdit?: (folder: PrimaryFolder) => void;
  onDelete?: (folder: PrimaryFolder) => void;
  className?: string;
}

// Icon mapping for dynamic icon rendering
const iconMap = {
  MapPin, Building, FileText, Megaphone, Archive, Folder,
  Briefcase, Globe, Plane, Car, Home, Calendar, Users,
  Settings, Star, Heart, Shield, Camera, Music, Video
};

export const PrimaryFolderCard = ({ 
  primaryFolder, 
  isAdmin, 
  onClick, 
  onEdit, 
  onDelete,
  className 
}: PrimaryFolderCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  
  // Get the icon component
  const IconComponent = iconMap[primaryFolder.icon as keyof typeof iconMap] || Folder;
  
  // Check if user can see this folder
  const canView = primaryFolder.permissions.visibility === 'public' || 
                  (primaryFolder.permissions.visibility === 'admin-only' && isAdmin);
  
  if (!canView) {
    return null;
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit?.(primaryFolder);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete?.(primaryFolder);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className={cn('relative group', className)}
    >
      <GlassCard 
        className={cn(
          'p-6 cursor-pointer transition-all duration-300 hover:shadow-xl relative overflow-hidden',
          'hover:bg-white/10 border-2 border-transparent',
          `hover:border-[${primaryFolder.color}]/30`
        )}
        onClick={onClick}
      >
        {/* Background gradient */}
        <div 
          className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
          style={{
            background: `linear-gradient(135deg, ${primaryFolder.color}20 0%, ${primaryFolder.color}05 100%)`
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center glass-button"
                style={{ backgroundColor: `${primaryFolder.color}20`, color: primaryFolder.color }}
              >
                <IconComponent size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-white mb-1">
                  {primaryFolder.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="px-2 py-1 bg-white/10 rounded-full">
                    {primaryFolder.slug}
                  </span>
                  {primaryFolder.isSystem && (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full">
                      System
                    </span>
                  )}
                  {primaryFolder.permissions.visibility === 'admin-only' && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
                      <EyeOff size={10} />
                      Admin Only
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Menu button for admin users */}
            {isAdmin && (onEdit || onDelete) && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMenuClick}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
                >
                  <MoreVertical size={16} />
                </Button>
                
                {/* Dropdown menu */}
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-0 top-full mt-2 w-48 glass-dark rounded-lg border border-white/10 shadow-xl z-50"
                  >
                    <div className="p-2">
                      {onEdit && (
                        <button
                          onClick={handleEdit}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded-lg flex items-center gap-2"
                        >
                          <Edit size={14} />
                          Edit Category
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={handleDelete}
                          disabled={primaryFolder.isSystem}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded-lg flex items-center gap-2 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} />
                          {primaryFolder.isSystem ? 'Protected' : 'Delete Category'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          
          {/* Description */}
          {primaryFolder.description && (
            <p className="text-sm text-white/70 mb-4 line-clamp-2">
              {primaryFolder.description}
            </p>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xl font-bold text-white">
                {primaryFolder.subFolderCount}
              </div>
              <div className="text-xs text-white/50">Sub-folders</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">
                {primaryFolder.documentCount}
              </div>
              <div className="text-xs text-white/50">Documents</div>
            </div>
          </div>
          
          {/* Storage info */}
          {primaryFolder.totalSize !== undefined && primaryFolder.totalSize > 0 && (
            <div className="text-center">
              <div className="text-sm text-white/60">
                {formatFileSize(primaryFolder.totalSize)}
              </div>
              <div className="text-xs text-white/40">Total size</div>
            </div>
          )}
          
          {/* Permissions indicators */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-white/50">
              {primaryFolder.permissions.canUpload && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Upload
                </span>
              )}
              {primaryFolder.permissions.canCreate && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Create
                </span>
              )}
            </div>
            
            <div className="text-xs text-white/40">
              {primaryFolder.permissions.visibility === 'public' ? (
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  Public
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <EyeOff size={12} />
                  {primaryFolder.permissions.visibility === 'admin-only' ? 'Admin' : 'Restricted'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Hover effect border */}
        <div 
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 1px ${primaryFolder.color}30`
          }}
        />
      </GlassCard>
      
      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </motion.div>
  );
};