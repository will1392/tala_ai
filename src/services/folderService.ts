import { buildApiUrl } from '../utils/api';

export interface Folder {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  documentCount: number;
  userId: string;
  primaryFolderId?: string;
  parentId?: string;
}

export interface CreateFolderRequest {
  name: string;
  description?: string;
  userId: string;
  isAdmin?: boolean;
  primaryFolderId?: string;
  parentId?: string;
}

class FolderService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = buildApiUrl();
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('auth_token');
    // Only add Authorization header if we have a valid-looking token (not empty/null)
    // In development with MOCK_AUTH=true, no token is fine
    if (token && token.trim().length > 0) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async createFolder(userId: string, request: CreateFolderRequest): Promise<Folder> {
    console.log('📁 Creating folder:', request.name, 'for user:', userId);
    
    const response = await fetch(`${this.baseUrl}/folders`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'x-user-id': userId
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create folder';
      try {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(`${errorMessage} (Status: ${response.status})`);
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

    const response = await fetch(`${this.baseUrl}/folders?${params}`, {
      headers: this.getAuthHeaders(),
    });

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
    
    const response = await fetch(`${this.baseUrl}/folders/${folderId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
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
    
    const response = await fetch(`${this.baseUrl}/folders/${folderId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
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