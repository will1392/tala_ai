/**
 * Google Drive Integration Service
 * Handles authentication and file operations with Google Drive API
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
}

export interface DriveAuthConfig {
  clientId: string;
  apiKey: string;
  discoveryDocs: string[];
  scopes: string[];
}

class GoogleDriveService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private isInitialized = false;

  private readonly config: DriveAuthConfig = {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ]
  };

  /**
   * Initialize the Google API client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      // Load the Google API script
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        // @ts-ignore
        window.gapi.load('client:picker', async () => {
          try {
            // @ts-ignore
            await window.gapi.client.init({
              apiKey: this.config.apiKey,
              discoveryDocs: this.config.discoveryDocs,
            });
            this.isInitialized = true;
            resolve();
          } catch (error) {
            console.error('Error initializing Google API client:', error);
            reject(error);
          }
        });
      };
      script.onerror = reject;
      document.body.appendChild(script);

      // Load Google Identity Services
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        // @ts-ignore
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.config.clientId,
          scope: this.config.scopes.join(' '),
          callback: '', // Will be set per-request
        });
      };
      document.body.appendChild(gisScript);
    });
  }

  /**
   * Authenticate user and get access token
   */
  async authenticate(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      this.tokenClient.callback = (response: any) => {
        if (response.error) {
          console.error('Authentication error:', response);
          resolve(false);
          return;
        }
        this.accessToken = response.access_token;
        resolve(true);
      };

      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  /**
   * Show Google Picker for file selection
   */
  async showPicker(onSelect: (files: DriveFile[]) => void): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.accessToken) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Failed to authenticate with Google Drive');
      }
    }

    // @ts-ignore
    const picker = new window.google.picker.PickerBuilder()
      .addView(
        // @ts-ignore
        new window.google.picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false)
      )
      .setOAuthToken(this.accessToken)
      .setDeveloperKey(this.config.apiKey)
      .setCallback((data: any) => {
        // @ts-ignore
        if (data.action === window.google.picker.Action.PICKED) {
          const files: DriveFile[] = data.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            size: doc.sizeBytes,
            thumbnailLink: doc.thumbnailUrl,
            webViewLink: doc.url,
          }));
          onSelect(files);
        }
      })
      .build();

    picker.setVisible(true);
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string): Promise<Blob> {
    if (!this.accessToken) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Not authenticated');
      }
    }

    try {
      // Get file metadata first
      const metadataResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,name`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!metadataResponse.ok) {
        throw new Error('Failed to get file metadata');
      }

      const metadata = await metadataResponse.json();
      const mimeType = metadata.mimeType;

      // Check if it's a Google Workspace file (Docs, Sheets, Slides)
      let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      let exportMimeType = null;

      if (mimeType.startsWith('application/vnd.google-apps.')) {
        // Export Google Workspace files
        const exportMimeTypes: { [key: string]: string } = {
          'application/vnd.google-apps.document': 'application/pdf',
          'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };

        exportMimeType = exportMimeTypes[mimeType];
        if (exportMimeType) {
          downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`;
        }
      }

      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      return await response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<DriveFile> {
    if (!this.accessToken) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Not authenticated');
      }
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get file metadata');
    }

    return await response.json();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Sign out
   */
  signOut(): void {
    this.accessToken = null;
  }
}

export const googleDriveService = new GoogleDriveService();
