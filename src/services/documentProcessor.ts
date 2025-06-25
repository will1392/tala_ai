// import PDFParse from 'pdf-parse'; // Not compatible with browser
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * Document Processing Service for Tala AI
 * 
 * Handles extraction of text content from various document formats:
 * - PDF files
 * - Word documents (.docx)
 * - Excel spreadsheets (.xlsx, .xls)
 * - Plain text files
 */

export interface ProcessedDocument {
  id: string;
  originalName: string;
  fileType: string;
  content: string;
  metadata: DocumentMetadata;
  chunks: DocumentChunk[];
  processingTime: number;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  pageCount?: number;
  wordCount: number;
  language?: string;
  extractedAt: Date;
  fileSize: number;
  categories: string[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  startIndex: number;
  endIndex: number;
}

export interface ChunkMetadata {
  chunkIndex: number;
  pageNumber?: number;
  section?: string;
  headings: string[];
  wordCount: number;
}

export class DocumentProcessor {
  private readonly chunkSize: number = 500; // words per chunk
  private readonly chunkOverlap: number = 50; // words overlap between chunks
  
  constructor(chunkSize?: number, chunkOverlap?: number) {
    if (chunkSize) this.chunkSize = chunkSize;
    if (chunkOverlap) this.chunkOverlap = chunkOverlap;
  }

  /**
   * Process a document file and extract text content with metadata
   */
  async processDocument(file: File): Promise<ProcessedDocument> {
    const startTime = Date.now();
    
    try {
      const fileType = this.getFileType(file.name);
      const content = await this.extractText(file, fileType);
      
      const metadata: DocumentMetadata = {
        title: this.extractTitle(file.name, content),
        wordCount: this.countWords(content),
        extractedAt: new Date(),
        fileSize: file.size,
        categories: this.detectCategories(content)
      };

      const chunks = this.createChunks(content);
      
      const processed: ProcessedDocument = {
        id: this.generateDocumentId(),
        originalName: file.name,
        fileType,
        content,
        metadata,
        chunks,
        processingTime: Date.now() - startTime
      };

      console.log(`📄 Processed document: ${file.name} (${chunks.length} chunks, ${metadata.wordCount} words)`);
      return processed;
      
    } catch (error) {
      console.error('❌ Document processing failed:', error);
      throw new Error(`Failed to process document ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content based on file type
   */
  private async extractText(file: File, fileType: string): Promise<string> {
    const buffer = await file.arrayBuffer();

    switch (fileType) {
      case 'pdf':
        return await this.extractPDFText(buffer);
      
      case 'docx':
        return await this.extractWordText(buffer);
      
      case 'xlsx':
      case 'xls':
        return await this.extractExcelText(buffer);
      
      case 'txt':
        return await this.extractPlainText(buffer);
      
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Extract text from PDF files
   */
  private async extractPDFText(buffer: ArrayBuffer): Promise<string> {
    // PDF parsing needs to be done server-side or with a browser-compatible library
    // For now, return a placeholder or use a different approach
    console.warn('PDF parsing in browser requires server-side processing or browser-compatible library');
    return '[PDF content would be extracted server-side]';
  }

  /**
   * Extract text from Word documents
   */
  private async extractWordText(buffer: ArrayBuffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      return result.value;
    } catch (error) {
      throw new Error(`Word document extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from Excel spreadsheets
   */
  private async extractExcelText(buffer: ArrayBuffer): Promise<string> {
    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      let text = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        text += `Sheet: ${sheetName}\n${csvData}\n\n`;
      });
      
      return text;
    } catch (error) {
      throw new Error(`Excel extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractPlainText(buffer: ArrayBuffer): Promise<string> {
    try {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(buffer);
    } catch (error) {
      throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create overlapping chunks from document content
   */
  private createChunks(content: string): DocumentChunk[] {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const chunks: DocumentChunk[] = [];
    
    let startIndex = 0;
    let chunkIndex = 0;
    
    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, words.length);
      const chunkWords = words.slice(startIndex, endIndex);
      const chunkContent = chunkWords.join(' ');
      
      const chunk: DocumentChunk = {
        id: `chunk_${chunkIndex}`,
        content: chunkContent,
        metadata: {
          chunkIndex,
          headings: this.extractHeadings(chunkContent),
          wordCount: chunkWords.length
        },
        startIndex,
        endIndex
      };
      
      chunks.push(chunk);
      
      // Move start index forward, accounting for overlap
      startIndex += this.chunkSize - this.chunkOverlap;
      chunkIndex++;
    }
    
    return chunks;
  }

  /**
   * Detect document categories based on content
   */
  private detectCategories(content: string): string[] {
    const categories: string[] = [];
    const lowerContent = content.toLowerCase();
    
    // Travel categories detection
    if (this.containsTerms(lowerContent, ['visa', 'passport', 'embassy', 'consulate', 'application'])) {
      categories.push('visa');
    }
    
    if (this.containsTerms(lowerContent, ['airline', 'flight', 'baggage', 'check-in', 'boarding'])) {
      categories.push('airline');
    }
    
    if (this.containsTerms(lowerContent, ['destination', 'travel guide', 'tourism', 'attractions', 'hotel'])) {
      categories.push('destination');
    }
    
    if (this.containsTerms(lowerContent, ['policy', 'terms', 'conditions', 'agency', 'booking'])) {
      categories.push('agency');
    }
    
    // Default to general if no specific category detected
    if (categories.length === 0) {
      categories.push('general');
    }
    
    return categories;
  }

  /**
   * Extract headings from text content
   */
  private extractHeadings(content: string): string[] {
    const headings: string[] = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      // Simple heading detection - lines that are short and start with capital
      if (trimmed.length > 0 && trimmed.length < 100 && 
          /^[A-Z]/.test(trimmed) && !trimmed.endsWith('.')) {
        headings.push(trimmed);
      }
    });
    
    return headings.slice(0, 3); // Limit to 3 headings per chunk
  }

  /**
   * Extract document title from filename or content
   */
  private extractTitle(filename: string, content: string): string {
    // Remove file extension and clean up filename
    const title = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
    
    // Try to extract title from content first lines
    const lines = content.split('\n').slice(0, 5);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 5 && trimmed.length < 100 && /^[A-Z]/.test(trimmed)) {
        return trimmed;
      }
    }
    
    return title;
  }

  /**
   * Utility methods
   */
  private getFileType(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    return extension || 'unknown';
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private containsTerms(text: string, terms: string[]): boolean {
    return terms.some(term => text.includes(term));
  }

  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get supported file types
   */
  static getSupportedTypes(): string[] {
    return ['pdf', 'docx', 'xlsx', 'xls', 'txt'];
  }

  /**
   * Check if file type is supported
   */
  static isSupported(filename: string): boolean {
    const extension = filename.toLowerCase().split('.').pop();
    return this.getSupportedTypes().includes(extension || '');
  }
}