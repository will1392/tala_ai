import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PDFParse = require('pdf-parse');
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Add request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, and text files are allowed.'));
    }
  }
});

// Utility functions
function getCollectionName(userId, isAdmin = false) {
  if (isAdmin) {
    return 'tala_admin_knowledge';
  }
  return userId ? `tala_user_${userId}_knowledge` : 'tala_admin_knowledge';
}

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float'
  });
  return response.data[0].embedding;
}

async function extractTextFromFile(buffer, mimetype, filename) {
  try {
    switch (mimetype) {
      case 'application/pdf':
        const pdfData = await PDFParse(buffer);
        return pdfData.text;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        const wordResult = await mammoth.extractRawText({ buffer });
        return wordResult.value;
        
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        const workbook = XLSX.read(buffer);
        let text = '';
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const csvData = XLSX.utils.sheet_to_csv(sheet);
          text += `Sheet: ${sheetName}\\n${csvData}\\n\\n`;
        });
        return text;
        
      case 'text/plain':
        return buffer.toString('utf-8');
        
      default:
        throw new Error(`Unsupported file type: ${mimetype}`);
    }
  } catch (error) {
    console.error(`Error extracting text from ${filename}:`, error);
    throw new Error(`Failed to extract text from ${filename}: ${error.message}`);
  }
}

function createChunks(text, chunkSize = 300, overlap = 50) {
  const words = text.split(/\\s+/).filter(word => word.length > 0);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push({
        id: uuidv4(),
        content: chunk,
        metadata: {
          chunkIndex: chunks.length,
          wordCount: chunk.split(/\\s+/).length,
          startIndex: i,
          endIndex: Math.min(i + chunkSize, words.length)
        }
      });
    }
  }
  
  return chunks;
}

async function ensureCollectionExists(collectionName) {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === collectionName);
    
    if (!exists) {
      console.log(`Creating collection: ${collectionName}`);
      await qdrant.createCollection(collectionName, {
        vectors: {
          size: 1536, // text-embedding-3-small dimension
          distance: 'Cosine'
        },
        optimizers_config: {
          default_segment_number: 2
        },
        replication_factor: 1
      });
      
      // Create indexes
      const indexes = [
        { field: 'metadata.category', type: 'keyword' },
        { field: 'document.fileType', type: 'keyword' },
        { field: 'documentId', type: 'keyword' },
        { field: 'metadata.chunkIndex', type: 'integer' }
      ];
      
      for (const index of indexes) {
        try {
          await qdrant.createPayloadIndex(collectionName, {
            field_name: index.field,
            field_schema: index.type
          });
        } catch (error) {
          console.warn(`Failed to create index ${index.field}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to ensure collection ${collectionName}:`, error);
    throw error;
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Upload document
app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, isAdmin = 'false' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log(`📄 Processing upload for user ${userId} (admin: ${isAdmin})`);
    
    const file = req.file;
    const documentId = uuidv4();
    const collectionName = getCollectionName(userId, isAdmin === 'true');
    
    // Ensure collection exists
    await ensureCollectionExists(collectionName);
    
    // Extract text from file
    const text = await extractTextFromFile(file.buffer, file.mimetype, file.originalname);
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text content found in file' });
    }

    // Create chunks
    const chunks = createChunks(text);
    
    if (chunks.length === 0) {
      return res.status(400).json({ error: 'Failed to create chunks from document' });
    }

    // Process chunks in batches
    const batchSize = 10;
    const points = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Generate embeddings for batch
      const embeddingPromises = batch.map(chunk => generateEmbedding(chunk.content));
      const embeddings = await Promise.all(embeddingPromises);
      
      // Create vector points
      batch.forEach((chunk, batchIndex) => {
        points.push({
          id: `${documentId}_${chunk.id}`,
          vector: embeddings[batchIndex],
          payload: {
            documentId,
            chunkId: chunk.id,
            content: chunk.content,
            metadata: {
              title: file.originalname,
              category: 'general', // Could be enhanced with classification
              chunkIndex: chunk.metadata.chunkIndex,
              wordCount: chunk.metadata.wordCount,
              headings: [] // Could be enhanced with heading extraction
            },
            document: {
              originalName: file.originalname,
              fileType: file.mimetype,
              uploadedAt: new Date().toISOString(),
              fileSize: file.size,
              userId: userId,
              isAdminDocument: isAdmin === 'true'
            }
          }
        });
      });
    }
    
    // Store in Qdrant
    await qdrant.upsert(collectionName, {
      wait: true,
      points: points
    });
    
    console.log(`✅ Stored ${points.length} vectors for document: ${file.originalname}`);
    
    res.json({
      documentId,
      chunksStored: points.length,
      filename: file.originalname,
      collectionName,
      isAdminDocument: isAdmin === 'true'
    });
    
  } catch (error) {
    console.error('📄 Upload error:', error);
    console.error('📄 Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to process document',
      details: error.message 
    });
  }
});

// Search documents
app.post('/api/documents/search', async (req, res) => {
  try {
    const { query, userId, isAdmin = false, limit = 10, scoreThreshold = 0.7 } = req.body;
    
    if (!query || !userId) {
      return res.status(400).json({ error: 'Query and userId are required' });
    }
    
    // Generate query embedding
    const queryVector = await generateEmbedding(query);
    
    // Determine collections to search
    const collectionsToSearch = [];
    
    if (isAdmin) {
      collectionsToSearch.push('tala_admin_knowledge');
    } else {
      collectionsToSearch.push(getCollectionName(userId, false)); // User collection
      collectionsToSearch.push('tala_admin_knowledge'); // Admin collection
    }
    
    const allResults = [];
    
    // Search each collection
    for (const collectionName of collectionsToSearch) {
      try {
        const collections = await qdrant.getCollections();
        const exists = collections.collections.some(c => c.name === collectionName);
        
        if (!exists) {
          console.log(`Collection ${collectionName} does not exist, skipping`);
          continue;
        }
        
        const searchResult = await qdrant.search(collectionName, {
          vector: queryVector,
          limit: Math.ceil(limit / collectionsToSearch.length) + 5,
          with_payload: true,
          with_vector: false
        });
        
        const collectionResults = searchResult
          .filter(result => result.score >= scoreThreshold)
          .map(result => ({
            id: result.id,
            score: result.score,
            content: result.payload?.content,
            metadata: {
              ...result.payload?.metadata,
              source: collectionName === 'tala_admin_knowledge' ? 'admin' : 'personal'
            },
            document: result.payload?.document
          }));
          
        allResults.push(...collectionResults);
        
      } catch (error) {
        console.warn(`Failed to search collection ${collectionName}:`, error.message);
      }
    }
    
    // Sort by relevance and limit results
    const results = allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    res.json({
      results,
      totalResults: results.length,
      query,
      collectionsSearched: collectionsToSearch,
      processingTime: Date.now() - req.startTime
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      details: error.message
    });
  }
});

// Get collections info
app.get('/api/collections', async (req, res) => {
  try {
    const collections = await qdrant.getCollections();
    res.json(collections);
  } catch (error) {
    console.error('Collections error:', error);
    res.status(500).json({ error: 'Failed to get collections' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Tala AI Backend Server running on port ${PORT}`);
  console.log(`📡 CORS enabled for: ${process.env.CORS_ORIGIN}`);
  console.log(`🔗 Qdrant URL: ${process.env.QDRANT_URL}`);
});