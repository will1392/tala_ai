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
  type: 'Document'|'Spreadsheet'|'Presentation'|'Markdown'|'PDF'|'Audio';
  updated: string;        // e.g. "2h ago"
  previewUrl?: string;    // optional (PDF/image/audio/text preview)
  content?: string;       // optional text content (or transcription for audio)
  metadata?: {
    mediaType?: string;
    audioDuration?: number;
    audioLanguage?: string;
    audioConfidence?: number;
    [key: string]: any;
  };
};