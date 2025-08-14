export type FolderNode = {
  id: string;
  name: string;
  parentId: string | null;
  children?: FolderNode[];
  documentCount?: number;
};

export type Folder = { 
  id: string; 
  name: string; 
};

export type Doc = {
  id: string;
  title: string;
  folder?: string;        // for backwards compatibility
  folderId: string;       // matches a FolderNode.id
  type: 'Document'|'Spreadsheet'|'Presentation'|'Markdown'|'PDF';
  updated: string;        // e.g. "2h ago"
  previewUrl?: string;    // optional (PDF/image/text preview)
  content?: string;       // optional text content
  metadata?: any;         // optional metadata
};