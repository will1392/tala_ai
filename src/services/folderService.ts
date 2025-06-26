export interface Folder {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  documentCount: number;
  userId: string;
}

export interface CreateFolderRequest {
  name: string;
  description?: string;
  userId: string;
  isAdmin?: boolean;
}

class FolderService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  async createFolder(request: CreateFolderRequest): Promise<Folder> {
    console.log('📁 Creating folder:', request.name);
    
    const response = await fetch(`${this.baseUrl}/api/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create folder' }));
      throw new Error(error.error || 'Failed to create folder');
    }

    const folder = await response.json();
    console.log('✅ Folder created:', folder);
    return folder;
  }

  async getFolders(userId: string, isAdmin: boolean = false): Promise<Folder[]> {
    console.log('📁 Fetching folders for user:', userId);
    
    const params = new URLSearchParams({
      userId,
      isAdmin: isAdmin.toString(),
    });

    const response = await fetch(`${this.baseUrl}/api/folders?${params}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch folders' }));
      throw new Error(error.error || 'Failed to fetch folders');
    }

    const folders = await response.json();
    console.log('✅ Folders fetched:', folders.length);
    return folders;
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    console.log('🗑️ Deleting folder:', folderId);
    
    const response = await fetch(`${this.baseUrl}/api/folders/${folderId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete folder' }));
      throw new Error(error.error || 'Failed to delete folder');
    }

    console.log('✅ Folder deleted');
  }

  async updateFolder(folderId: string, updates: Partial<Pick<Folder, 'name' | 'description'>>, userId: string): Promise<Folder> {
    console.log('📝 Updating folder:', folderId);
    
    const response = await fetch(`${this.baseUrl}/api/folders/${folderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...updates, userId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update folder' }));
      throw new Error(error.error || 'Failed to update folder');
    }

    const folder = await response.json();
    console.log('✅ Folder updated:', folder);
    return folder;
  }
}

export const folderService = new FolderService();