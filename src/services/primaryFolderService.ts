import type { PrimaryFolder, CreatePrimaryFolderRequest, UpdatePrimaryFolderRequest, FolderHierarchy } from '../types/primaryFolder';

export interface PrimaryFolderStats {
  totalPrimaryFolders: number;
  totalSubFolders: number;
  totalDocuments: number;
  totalSize: number;
  primaryFolderStats: Array<{
    id: string;
    name: string;
    subFolderCount: number;
    documentCount: number;
    totalSize: number;
  }>;
}

class PrimaryFolderService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  /**
   * Get all primary folders
   */
  async getPrimaryFolders(userId: string, isAdmin: boolean = false): Promise<PrimaryFolder[]> {
    console.log('🗂️ Fetching primary folders for user:', userId);
    
    const params = new URLSearchParams({
      userId,
      isAdmin: isAdmin.toString(),
    });

    const response = await fetch(`${this.baseUrl}/api/primary-folders?${params}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch primary folders' }));
      throw new Error(error.error || 'Failed to fetch primary folders');
    }

    const primaryFolders = await response.json();
    console.log('✅ Primary folders fetched:', primaryFolders.length);
    return primaryFolders;
  }

  /**
   * Create a new primary folder
   */
  async createPrimaryFolder(request: CreatePrimaryFolderRequest): Promise<PrimaryFolder> {
    console.log('🗂️ Creating primary folder:', request.name);
    
    const response = await fetch(`${this.baseUrl}/api/primary-folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create primary folder' }));
      throw new Error(error.error || 'Failed to create primary folder');
    }

    const primaryFolder = await response.json();
    console.log('✅ Primary folder created:', primaryFolder);
    return primaryFolder;
  }

  /**
   * Update an existing primary folder
   */
  async updatePrimaryFolder(folderId: string, updates: UpdatePrimaryFolderRequest): Promise<PrimaryFolder> {
    console.log('📝 Updating primary folder:', folderId);
    
    const response = await fetch(`${this.baseUrl}/api/primary-folders/${folderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update primary folder' }));
      throw new Error(error.error || 'Failed to update primary folder');
    }

    const primaryFolder = await response.json();
    console.log('✅ Primary folder updated:', primaryFolder);
    return primaryFolder;
  }

  /**
   * Delete a primary folder
   */
  async deletePrimaryFolder(folderId: string, userId: string): Promise<void> {
    console.log('🗑️ Deleting primary folder:', folderId);
    
    const response = await fetch(`${this.baseUrl}/api/primary-folders/${folderId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete primary folder' }));
      throw new Error(error.error || 'Failed to delete primary folder');
    }

    console.log('✅ Primary folder deleted');
  }

  /**
   * Get folder hierarchy (primary folder with sub-folders)
   */
  async getFolderHierarchy(primaryFolderId: string, userId: string, isAdmin: boolean = false): Promise<FolderHierarchy> {
    console.log('🗂️ Fetching folder hierarchy for:', primaryFolderId);
    
    const params = new URLSearchParams({
      userId,
      isAdmin: isAdmin.toString(),
    });

    const response = await fetch(`${this.baseUrl}/api/primary-folders/${primaryFolderId}/hierarchy?${params}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch folder hierarchy' }));
      throw new Error(error.error || 'Failed to fetch folder hierarchy');
    }

    const hierarchy = await response.json();
    console.log('✅ Folder hierarchy fetched:', hierarchy);
    return hierarchy;
  }

  /**
   * Get primary folder by slug
   */
  async getPrimaryFolderBySlug(slug: string, userId: string, isAdmin: boolean = false): Promise<PrimaryFolder | null> {
    const primaryFolders = await this.getPrimaryFolders(userId, isAdmin);
    return primaryFolders.find(folder => folder.slug === slug) || null;
  }

  /**
   * Check if user can perform action on primary folder
   */
  canUserPerformAction(primaryFolder: PrimaryFolder, action: 'create' | 'upload' | 'edit', isAdmin: boolean = false): boolean {
    const permissions = primaryFolder.permissions;
    
    // Check visibility first
    if (permissions.visibility === 'admin-only' && !isAdmin) {
      return false;
    }

    // Check specific action permissions
    switch (action) {
      case 'create':
        return permissions.canCreate;
      case 'upload':
        return permissions.canUpload;
      case 'edit':
        return permissions.canEdit;
      default:
        return false;
    }
  }

  /**
   * Validate slug format
   */
  validateSlug(slug: string): { isValid: boolean; error?: string } {
    if (!slug || slug.length === 0) {
      return { isValid: false, error: 'Slug is required' };
    }
    
    if (slug.length < 2) {
      return { isValid: false, error: 'Slug must be at least 2 characters long' };
    }
    
    if (slug.length > 50) {
      return { isValid: false, error: 'Slug must be less than 50 characters' };
    }
    
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { isValid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
    }
    
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return { isValid: false, error: 'Slug cannot start or end with a hyphen' };
    }
    
    if (slug.includes('--')) {
      return { isValid: false, error: 'Slug cannot contain consecutive hyphens' };
    }
    
    return { isValid: true };
  }

  /**
   * Generate a slug from a name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Get available colors for primary folders
   */
  getAvailableColors(): Array<{ name: string; value: string; preview: string }> {
    return [
      { name: 'Emerald', value: '#10b981', preview: 'bg-emerald-500' },
      { name: 'Blue', value: '#3b82f6', preview: 'bg-blue-500' },
      { name: 'Amber', value: '#f59e0b', preview: 'bg-amber-500' },
      { name: 'Pink', value: '#ec4899', preview: 'bg-pink-500' },
      { name: 'Purple', value: '#8b5cf6', preview: 'bg-purple-500' },
      { name: 'Red', value: '#ef4444', preview: 'bg-red-500' },
      { name: 'Orange', value: '#f97316', preview: 'bg-orange-500' },
      { name: 'Teal', value: '#14b8a6', preview: 'bg-teal-500' },
      { name: 'Indigo', value: '#6366f1', preview: 'bg-indigo-500' },
      { name: 'Gray', value: '#6b7280', preview: 'bg-gray-500' },
    ];
  }

  /**
   * Get available icons for primary folders
   */
  getAvailableIcons(): Array<{ name: string; value: string }> {
    return [
      { name: 'Folder', value: 'Folder' },
      { name: 'Map Pin', value: 'MapPin' },
      { name: 'Building', value: 'Building' },
      { name: 'File Text', value: 'FileText' },
      { name: 'Megaphone', value: 'Megaphone' },
      { name: 'Archive', value: 'Archive' },
      { name: 'Briefcase', value: 'Briefcase' },
      { name: 'Globe', value: 'Globe' },
      { name: 'Plane', value: 'Plane' },
      { name: 'Car', value: 'Car' },
      { name: 'Hotel', value: 'Home' },
      { name: 'Calendar', value: 'Calendar' },
      { name: 'Users', value: 'Users' },
      { name: 'Settings', value: 'Settings' },
      { name: 'Star', value: 'Star' },
      { name: 'Heart', value: 'Heart' },
      { name: 'Shield', value: 'Shield' },
      { name: 'Camera', value: 'Camera' },
      { name: 'Music', value: 'Music' },
      { name: 'Video', value: 'Video' },
    ];
  }
}

export const primaryFolderService = new PrimaryFolderService();
export default PrimaryFolderService;