interface ExtractionResult {
  success: boolean;
  data: {
    summary?: string;
    keyData?: Array<{
      label: string;
      value: string;
    }>;
    fullText?: string;
    metadata?: {
      title?: string;
      author?: string;
      pages?: number;
      fileSize?: string;
      type?: string;
    };
  };
  error?: string;
}

export class DocumentExtractionService {
  static async extractData(
    files: File[], 
    extractType: 'summary' | 'key-data' | 'full-text'
  ): Promise<ExtractionResult> {
    try {
      const formData = new FormData();
      
      // Add files to form data
      files.forEach((file, index) => {
        formData.append(`document_${index}`, file);
      });
      
      // Add extraction type
      formData.append('extractType', extractType);
      formData.append('userId', 'admin-1');

      const response = await fetch('http://localhost:3001/api/documents/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Document extraction error:', error);
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown extraction error'
      };
    }
  }

  static async uploadAndStore(
    files: File[],
    options: {
      primaryFolderId?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; results: Array<{
    fileName: string;
    success: boolean;
    documentId: string;
    chunksStored: number;
    mediaType?: string;
    fileUrl?: string | null;
    transcription?: {
      text: string;
      language?: string;
      duration?: number;
      confidence?: number;
    } | null;
  }>; error?: string }> {
    try {
      const results = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('userId', 'admin-1');
        formData.append('isAdmin', 'true');
        
        if (options.primaryFolderId) {
          formData.append('primaryFolderId', options.primaryFolderId);
        }
        
        if (options.category) {
          formData.append('category', options.category);
        }
        
        if (options.tags && options.tags.length > 0) {
          formData.append('tags', JSON.stringify(options.tags));
        }

        const response = await fetch('http://localhost:3001/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}: ${response.statusText}`);
        }

        const result = await response.json();
        results.push({
          fileName: file.name,
          success: true,
          documentId: result.documentId,
          chunksStored: result.chunksStored,
          mediaType: result.mediaType,
          fileUrl: result.fileUrl,
          transcription: result.transcription ? {
            text: result.transcription.text,
            language: result.transcription.language,
            duration: result.transcription.duration,
            confidence: result.transcription.confidence
          } : null
        });
      }

      return {
        success: true,
        results
      };

    } catch (error) {
      console.error('Document upload error:', error);
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  static formatExtractionForDisplay(result: ExtractionResult, extractType: string): string {
    if (!result.success || !result.data) {
      return `❌ **Extraction failed:** ${result.error || 'Unknown error'}`;
    }

    let formatted = '';

    // Add metadata if available
    if (result.data.metadata) {
      const meta = result.data.metadata;
      formatted += '📄 **Document Information:**\n';
      if (meta.title) formatted += `• **Title:** ${meta.title}\n`;
      if (meta.author) formatted += `• **Author:** ${meta.author}\n`;
      if (meta.pages) formatted += `• **Pages:** ${meta.pages}\n`;
      if (meta.fileSize) formatted += `• **Size:** ${meta.fileSize}\n`;
      formatted += '\n';
    }

    // Add content based on extraction type
    switch (extractType) {
      case 'summary':
        if (result.data.summary) {
          formatted += '📋 **Summary:**\n\n';
          formatted += result.data.summary;
        }
        break;

      case 'key-data':
        if (result.data.keyData && result.data.keyData.length > 0) {
          formatted += '🔑 **Key Data:**\n\n';
          result.data.keyData.forEach(item => {
            formatted += `• **${item.label}:** ${item.value}\n`;
          });
        }
        break;

      case 'full-text':
        if (result.data.fullText) {
          formatted += '📝 **Full Content:**\n\n';
          formatted += result.data.fullText;
        }
        break;
    }

    return formatted || '⚠️ No data extracted from the document.';
  }
}

export type { ExtractionResult };