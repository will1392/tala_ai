/**
 * Document Processor Service
 * Handles document processing and extraction
 */

import { createRequire } from 'module';
import mammoth from 'mammoth';
import XLSX from 'xlsx';

const require = createRequire(import.meta.url);
const PDFParse = require('pdf-parse');

export default class DocumentProcessor {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    console.log('📄 Document processor initialized');
    this.initialized = true;
  }

  async processDocument(doc, options = {}) {
    const { buffer, mimetype, filename, originalname } = doc;
    const actualFilename = filename || originalname || 'unknown';
    
    console.log('📄 Processing document:', {
      filename: actualFilename,
      mimetype,
      bufferSize: buffer?.length
    });

    try {
      let text = '';
      let type = 'document';
      let visualContent = null;
      let entities = {};

      // Extract text based on file type
      if (mimetype === 'application/pdf' || actualFilename.endsWith('.pdf')) {
        console.log('📕 Extracting text from PDF...');
        const pdfData = await PDFParse(buffer);
        text = pdfData.text || '';
        console.log(`✅ PDF extracted: ${text.length} characters`);
      } 
      else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        actualFilename.endsWith('.docx')
      ) {
        console.log('📘 Extracting text from DOCX...');
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || '';
        console.log(`✅ DOCX extracted: ${text.length} characters`);
      }
      else if (
        mimetype === 'application/msword' ||
        actualFilename.endsWith('.doc')
      ) {
        console.log('📙 Extracting text from DOC (legacy format)...');
        // For legacy .doc files, try basic extraction
        text = buffer.toString('utf-8');
        // Clean up binary artifacts
        text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        console.log(`✅ DOC extracted: ${text.length} characters`);
      }
      else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimetype === 'application/vnd.ms-excel' ||
        actualFilename.match(/\.(xlsx?|csv)$/)
      ) {
        console.log('📊 Extracting text from spreadsheet...');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheets = [];
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = XLSX.utils.sheet_to_txt(worksheet);
          sheets.push(`Sheet: ${sheetName}\n${sheetText}`);
        });
        
        text = sheets.join('\n\n');
        console.log(`✅ Spreadsheet extracted: ${text.length} characters from ${sheets.length} sheets`);
      }
      else if (
        mimetype === 'text/plain' ||
        mimetype === 'text/markdown' ||
        actualFilename.match(/\.(txt|md)$/)
      ) {
        console.log('📝 Extracting text from text file...');
        text = buffer.toString('utf-8');
        console.log(`✅ Text file extracted: ${text.length} characters`);
      }
      else if (mimetype?.startsWith('image/')) {
        console.log('🖼️ Image file detected');
        type = 'visual';
        text = `[Image: ${actualFilename}]`;
        visualContent = {
          type: 'image',
          elements: [{ type: 'image', filename: actualFilename }]
        };
      }
      else {
        console.warn(`⚠️ Unsupported file type: ${mimetype}`);
        // Try to extract as text anyway
        try {
          text = buffer.toString('utf-8');
          text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
          console.log(`✅ Fallback text extraction: ${text.length} characters`);
        } catch (err) {
          console.error('❌ Fallback extraction failed:', err.message);
          text = '';
        }
      }

      // Clean up extracted text
      text = text.trim();

      return {
        success: true,
        text,
        content: text, // Support both property names
        type,
        visualContent,
        entities,
        chunks: [], // Chunks will be created by caller
        metadata: {
          filename: actualFilename,
          mimetype,
          length: text.length,
          type
        }
      };
    } catch (error) {
      console.error('❌ Document processing error:', error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  async extractText(buffer, mimeType) {
    const result = await this.processDocument({ buffer, mimetype: mimeType });
    return result.content || '';
  }

  async generateEmbeddings(text) {
    console.log('Generating embeddings for text');
    return [];
  }
}
