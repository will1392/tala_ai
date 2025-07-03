// Primary Folder Types
export interface PrimaryFolder {
  id: string;
  slug: string; // URL-friendly identifier (e.g., "destinations", "suppliers")
  name: string; // Human-friendly name (e.g., "Destinations", "Suppliers")
  description?: string;
  icon?: string; // Icon name from Lucide React
  color?: string; // Theme color for this primary folder
  order: number; // Display order
  permissions: {
    visibility: 'public' | 'admin-only' | 'role-based';
    allowedRoles?: string[]; // For role-based permissions
    canCreate: boolean; // Can users create sub-folders here
    canUpload: boolean; // Can users upload documents here
    canEdit: boolean; // Can users edit this primary folder
  };
  isSystem: boolean; // If true, cannot be deleted (for default folders)
  createdAt: string;
  updatedAt: string;
  userId: string; // Creator
  subFolderCount: number;
  documentCount: number;
  totalSize?: number; // Total size of all documents in bytes
}

export interface CreatePrimaryFolderRequest {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  permissions?: Partial<PrimaryFolder['permissions']>;
  userId: string;
}

export interface UpdatePrimaryFolderRequest {
  slug?: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  permissions?: Partial<PrimaryFolder['permissions']>;
  userId: string;
}

export interface FolderHierarchy {
  primaryFolder: PrimaryFolder;
  subFolders: any[]; // Using any for now to avoid circular dependency
}

// Default primary folders configuration
export const DEFAULT_PRIMARY_FOLDERS: Omit<PrimaryFolder, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'subFolderCount' | 'documentCount'>[] = [
  {
    slug: 'destinations',
    name: 'Destinations',
    description: 'Travel destination guides, requirements, and information',
    icon: 'MapPin',
    color: '#10b981', // emerald-500
    order: 1,
    permissions: {
      visibility: 'public',
      canCreate: true,
      canUpload: true,
      canEdit: false
    },
    isSystem: true,
    totalSize: 0
  },
  {
    slug: 'suppliers',
    name: 'Suppliers',
    description: 'Hotel, airline, and service provider information',
    icon: 'Building',
    color: '#3b82f6', // blue-500
    order: 2,
    permissions: {
      visibility: 'public',
      canCreate: true,
      canUpload: true,
      canEdit: false
    },
    isSystem: true,
    totalSize: 0
  },
  {
    slug: 'policies-regulations',
    name: 'Policies & Regulations',
    description: 'Travel policies, visa requirements, and regulatory information',
    icon: 'FileText',
    color: '#f59e0b', // amber-500
    order: 3,
    permissions: {
      visibility: 'public',
      canCreate: true,
      canUpload: true,
      canEdit: false
    },
    isSystem: true,
    totalSize: 0
  },
  {
    slug: 'marketing-materials',
    name: 'Marketing Materials',
    description: 'Brochures, promotional content, and marketing assets',
    icon: 'Megaphone',
    color: '#ec4899', // pink-500
    order: 4,
    permissions: {
      visibility: 'admin-only',
      canCreate: true,
      canUpload: true,
      canEdit: false
    },
    isSystem: true,
    totalSize: 0
  },
  {
    slug: 'miscellaneous',
    name: 'Miscellaneous',
    description: 'Other documents and files that don\'t fit into specific categories',
    icon: 'Archive',
    color: '#6b7280', // gray-500
    order: 5,
    permissions: {
      visibility: 'public',
      canCreate: true,
      canUpload: true,
      canEdit: false
    },
    isSystem: true,
    totalSize: 0
  }
];