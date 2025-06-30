import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Serve uploaded files with proper headers
app.use('/api/files', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}, express.static(uploadsDir));

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
  // Truncate text to ensure it fits within token limits
  // Approximate 1 token = 4 characters for English text
  const maxChars = 30000; // ~7500 tokens, well under 8192 limit
  const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: truncatedText,
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

function createChunks(text, chunkSize = 150, overlap = 25) {
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

// Persistent folder storage using JSON file
const foldersFilePath = path.join(process.cwd(), 'folders.json');

// Load folders from file
function loadFolders() {
  try {
    if (fs.existsSync(foldersFilePath)) {
      const data = fs.readFileSync(foldersFilePath, 'utf8');
      const foldersArray = JSON.parse(data);
      const foldersMap = new Map();
      foldersArray.forEach(folder => foldersMap.set(folder.id, folder));
      console.log(`📁 Loaded ${foldersArray.length} folders from storage`);
      return foldersMap;
    }
  } catch (error) {
    console.warn('Failed to load folders:', error);
  }
  return new Map();
}

// Save folders to file
function saveFolders(foldersMap) {
  try {
    const foldersArray = Array.from(foldersMap.values());
    fs.writeFileSync(foldersFilePath, JSON.stringify(foldersArray, null, 2));
    console.log(`📁 Saved ${foldersArray.length} folders to storage`);
  } catch (error) {
    console.error('Failed to save folders:', error);
  }
}

// Initialize folders from persistent storage
const folders = loadFolders();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Folder Management Routes

// Create folder
app.post('/api/folders', async (req, res) => {
  try {
    const { name, description, userId, isAdmin = false } = req.body;
    
    if (!name || !userId) {
      return res.status(400).json({ error: 'Name and userId are required' });
    }

    const folderId = uuidv4();
    const folder = {
      id: folderId,
      name: name.trim(),
      description: description?.trim(),
      createdAt: new Date().toISOString(),
      documentCount: 0,
      userId,
      isAdmin
    };

    folders.set(folderId, folder);
    saveFolders(folders);
    
    console.log(`📁 Created folder: ${name} (ID: ${folderId})`);
    res.json(folder);
  } catch (error) {
    console.error('📁 Folder creation error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Get folders
app.get('/api/folders', async (req, res) => {
  try {
    const { userId, isAdmin = 'false' } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const userFolders = Array.from(folders.values()).filter(folder => {
      if (isAdmin === 'true') {
        return folder.isAdmin || folder.userId === userId;
      }
      return folder.userId === userId;
    });

    res.json(userFolders);
  } catch (error) {
    console.error('📁 Folder fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Update folder
app.put('/api/folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name, description, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const folder = folders.get(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folder.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (name) folder.name = name.trim();
    if (description !== undefined) folder.description = description?.trim();
    
    folders.set(folderId, folder);
    saveFolders(folders);
    
    console.log(`📁 Updated folder: ${folder.name} (ID: ${folderId})`);
    res.json(folder);
  } catch (error) {
    console.error('📁 Folder update error:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder
app.delete('/api/folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const folder = folders.get(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folder.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    folders.delete(folderId);
    saveFolders(folders);
    
    console.log(`📁 Deleted folder: ${folder.name} (ID: ${folderId})`);
    res.json({ success: true });
  } catch (error) {
    console.error('📁 Folder deletion error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Upload document
app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, isAdmin = 'false', folderId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log(`📄 Processing upload for user ${userId} (admin: ${isAdmin}) to folder: ${folderId || 'none'}`);
    
    if (folderId) {
      const folder = folders.get(folderId);
      console.log(`📁 Folder details:`, folder ? { id: folder.id, name: folder.name } : 'Folder not found');
    }
    
    const file = req.file;
    const documentId = uuidv4();
    const collectionName = getCollectionName(userId, isAdmin === 'true');
    
    // Ensure collection exists
    await ensureCollectionExists(collectionName);
    
    // Save original file for PDFs
    let fileUrl = null;
    if (file.mimetype === 'application/pdf') {
      const filename = `${documentId}-${file.originalname}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, file.buffer);
      fileUrl = `/api/files/${filename}`;
    }

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
          id: uuidv4(), // Use a fresh UUID for each point
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
              headings: [], // Could be enhanced with heading extraction
              folderId: folderId || null,
              folderName: folderId ? folders.get(folderId)?.name : null
            },
            document: {
              originalName: file.originalname,
              fileType: file.mimetype,
              uploadedAt: new Date().toISOString(),
              fileSize: file.size,
              userId: userId,
              isAdminDocument: isAdmin === 'true',
              fileUrl: fileUrl
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
    
    // Update folder document count
    if (folderId && folders.has(folderId)) {
      const folder = folders.get(folderId);
      folder.documentCount += 1;
      folders.set(folderId, folder);
      saveFolders(folders);
    }

    console.log(`✅ Stored ${points.length} vectors for document: ${file.originalname}`);
    
    res.json({
      documentId,
      chunksStored: points.length,
      filename: file.originalname,
      collectionName,
      isAdminDocument: isAdmin === 'true',
      folderId: folderId || null
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
    const { query, userId, isAdmin = false, limit = 10, scoreThreshold = 0.2, folderId } = req.body;
    
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
        
        // Build search filters for folder
        const searchFilter = {};
        if (folderId && folderId !== 'all') {
          searchFilter.must = [
            {
              key: 'metadata.folderId',
              match: { value: folderId }
            }
          ];
        }

        const searchResult = await qdrant.search(collectionName, {
          vector: queryVector,
          limit: Math.ceil(limit / collectionsToSearch.length) + 5,
          with_payload: true,
          with_vector: false,
          filter: Object.keys(searchFilter).length > 0 ? searchFilter : undefined
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

// Get all documents
app.get('/api/documents', async (req, res) => {
  try {
    const { userId, isAdmin = 'false', folderId, limit = 50, offset = 0 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    console.log(`📄 Getting documents for user ${userId} (admin: ${isAdmin}), folder: ${folderId || 'all'}, limit: ${limit}`);
    
    // Determine collections to search
    const collectionsToSearch = [];
    
    if (isAdmin === 'true') {
      // Admin can see all documents
      collectionsToSearch.push('tala_admin_knowledge');
      
      // Get all user collections
      const collections = await qdrant.getCollections();
      collections.collections.forEach(c => {
        if (c.name.startsWith('tala_user_') && c.name.endsWith('_knowledge')) {
          collectionsToSearch.push(c.name);
        }
      });
    } else {
      // Regular user sees their own + admin documents
      collectionsToSearch.push('tala_admin_knowledge');
      collectionsToSearch.push(getCollectionName(userId, false));
    }
    
    // Get documents from each collection
    const allDocuments = new Map(); // Use Map to deduplicate by documentId
    
    for (const collectionName of collectionsToSearch) {
      try {
        const collectionInfo = await qdrant.getCollection(collectionName);
        if (!collectionInfo) continue;
        
        // Scroll through all points in the collection
        let nextPageOffset = null;
        let hasMore = true;
        
        while (hasMore) {
          const scrollRequest = {
            limit: 100,
            offset: nextPageOffset,
            with_payload: true,
            with_vector: false
          };
          
          // Add filter only if we're filtering by folder
          if (folderId && folderId !== 'all') {
            // Try without nested path first
            scrollRequest.filter = {
              must: [{
                key: 'folderId',
                match: { value: folderId }
              }]
            };
            console.log(`📄 Filtering by folder: ${folderId}`);
          }
          
          let scrollResult;
          try {
            scrollResult = await qdrant.scroll(collectionName, scrollRequest);
            console.log(`📄 Found ${scrollResult.points.length} points in ${collectionName}`);
          } catch (scrollError) {
            console.error(`📄 Scroll error details:`, scrollError.message);
            // Try without filter to at least get all documents
            scrollResult = await qdrant.scroll(collectionName, {
              limit: 100,
              offset: nextPageOffset,
              with_payload: true,
              with_vector: false
            });
            console.log(`📄 Got ${scrollResult.points.length} points without filter`);
          }
          
          // Group points by documentId
          scrollResult.points.forEach(point => {
            const docId = point.payload.documentId;
            const pointFolderId = point.payload.metadata?.folderId;
            
            console.log(`📄 Point folder info:`, {
              docId: docId.substring(0, 8),
              pointFolderId,
              requestedFolderId: folderId,
              title: point.payload.metadata?.title || point.payload.document?.originalName
            });
            
            // Filter out documents that don't match the folder when folder is specified
            if (folderId && folderId !== 'all' && pointFolderId !== folderId) {
              console.log(`📄 Skipping document - folder mismatch`);
              return;
            }
            
            if (!allDocuments.has(docId)) {
              // First chunk of this document
              allDocuments.set(docId, {
                id: docId,
                title: point.payload.metadata?.title || point.payload.document?.originalName || 'Untitled',
                category: point.payload.metadata?.category || 'general',
                uploadedBy: point.payload.document?.userId || 'Unknown',
                uploadedAt: point.payload.document?.uploadedAt || new Date().toISOString(),
                fileSize: point.payload.document?.fileSize || 0,
                fileType: point.payload.document?.fileType || 'unknown',
                fileUrl: point.payload.document?.fileUrl || null,
                folderId: point.payload.metadata?.folderId || null,
                folderName: point.payload.metadata?.folderName || null,
                collectionName,
                chunkCount: 1,
                excerpt: point.payload.content ? point.payload.content.substring(0, 200) + '...' : ''
              });
            } else {
              // Additional chunk of existing document
              allDocuments.get(docId).chunkCount += 1;
            }
          });
          
          nextPageOffset = scrollResult.next_page_offset;
          hasMore = nextPageOffset !== null && nextPageOffset !== undefined;
        }
      } catch (error) {
        console.warn(`Failed to get documents from collection ${collectionName}:`, error.message);
      }
    }
    
    // Convert to array and apply pagination
    const documents = Array.from(allDocuments.values())
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      documents,
      totalDocuments: allDocuments.size,
      offset: parseInt(offset),
      limit: parseInt(limit),
      hasMore: allDocuments.size > parseInt(offset) + parseInt(limit)
    });
    
  } catch (error) {
    console.error('📄 Get documents error:', error);
    res.status(500).json({
      error: 'Failed to get documents',
      details: error.message
    });
  }
});

// Delete document
app.delete('/api/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId, isAdmin = 'false' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    console.log(`🗑️ Deleting document: ${documentId} for user ${userId} (admin: ${isAdmin})`);
    
    // Determine collections to search
    const collectionsToSearch = [];
    
    if (isAdmin === 'true') {
      collectionsToSearch.push('tala_admin_knowledge');
      
      // Get all user collections
      const collections = await qdrant.getCollections();
      collections.collections.forEach(c => {
        if (c.name.startsWith('tala_user_') && c.name.endsWith('_knowledge')) {
          collectionsToSearch.push(c.name);
        }
      });
    } else {
      collectionsToSearch.push('tala_admin_knowledge');
      collectionsToSearch.push(getCollectionName(userId, false));
    }
    
    let deletedCount = 0;
    let documentInfo = null;
    
    // Delete from each collection
    for (const collectionName of collectionsToSearch) {
      try {
        const collections = await qdrant.getCollections();
        const exists = collections.collections.some(c => c.name === collectionName);
        
        if (!exists) continue;
        
        // Find all points for this document
        const scrollResult = await qdrant.scroll(collectionName, {
          filter: {
            must: [{
              key: 'documentId',
              match: { value: documentId }
            }]
          },
          limit: 1000,
          with_payload: true,
          with_vector: false
        });
        
        if (scrollResult.points.length > 0) {
          // Store document info for folder count update
          const firstPoint = scrollResult.points[0];
          documentInfo = {
            folderId: firstPoint.payload?.metadata?.folderId,
            folderName: firstPoint.payload?.metadata?.folderName,
            title: firstPoint.payload?.metadata?.title || firstPoint.payload?.document?.originalName
          };
          
          // Delete all points for this document
          const pointIds = scrollResult.points.map(point => point.id);
          await qdrant.delete(collectionName, {
            points: pointIds
          });
          
          deletedCount += pointIds.length;
          console.log(`🗑️ Deleted ${pointIds.length} chunks from ${collectionName}`);
        }
      } catch (error) {
        console.warn(`Failed to delete from collection ${collectionName}:`, error.message);
      }
    }
    
    // Update folder document count if document was in a folder
    if (documentInfo?.folderId && folders.has(documentInfo.folderId)) {
      const folder = folders.get(documentInfo.folderId);
      folder.documentCount = Math.max(0, folder.documentCount - 1);
      folders.set(documentInfo.folderId, folder);
      saveFolders(folders);
      console.log(`📁 Updated folder count for: ${documentInfo.folderName}`);
    }
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    console.log(`✅ Successfully deleted document: ${documentInfo?.title} (${deletedCount} chunks)`);
    
    res.json({
      success: true,
      deletedChunks: deletedCount,
      documentInfo
    });
    
  } catch (error) {
    console.error('🗑️ Document deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete document',
      details: error.message
    });
  }
});

// Move document to different folder
app.put('/api/documents/:documentId/move', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId, isAdmin = 'false', folderId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    console.log(`📁 Moving document: ${documentId} to folder: ${folderId || 'root'} for user ${userId}`);
    
    // Determine collections to search
    const collectionsToSearch = [];
    
    if (isAdmin === 'true') {
      collectionsToSearch.push('tala_admin_knowledge');
      
      // Get all user collections
      const collections = await qdrant.getCollections();
      collections.collections.forEach(c => {
        if (c.name.startsWith('tala_user_') && c.name.endsWith('_knowledge')) {
          collectionsToSearch.push(c.name);
        }
      });
    } else {
      collectionsToSearch.push('tala_admin_knowledge');
      collectionsToSearch.push(getCollectionName(userId, false));
    }
    
    let updatedCount = 0;
    let documentInfo = null;
    let oldFolderId = null;
    
    // Update folder info in each collection
    for (const collectionName of collectionsToSearch) {
      try {
        const collections = await qdrant.getCollections();
        const exists = collections.collections.some(c => c.name === collectionName);
        
        if (!exists) continue;
        
        // Find all points for this document
        const scrollResult = await qdrant.scroll(collectionName, {
          filter: {
            must: [{
              key: 'documentId',
              match: { value: documentId }
            }]
          },
          limit: 1000,
          with_payload: true,
          with_vector: false
        });
        
        if (scrollResult.points.length > 0) {
          // Store document info
          const firstPoint = scrollResult.points[0];
          oldFolderId = firstPoint.payload?.metadata?.folderId;
          documentInfo = {
            title: firstPoint.payload?.metadata?.title || firstPoint.payload?.document?.originalName
          };
          
          // Update all points with new folder info
          const pointIds = scrollResult.points.map(point => point.id);
          const newPayload = {
            metadata: {
              ...scrollResult.points[0].payload.metadata,
              folderId: folderId || null,
              folderName: folderId ? folders.get(folderId)?.name : null
            }
          };
          
          await qdrant.setPayload(collectionName, {
            payload: newPayload,
            points: pointIds
          });
          
          updatedCount += pointIds.length;
        }
      } catch (error) {
        console.warn(`Failed to update collection ${collectionName}:`, error.message);
      }
    }
    
    // Update folder document counts
    if (oldFolderId && folders.has(oldFolderId)) {
      const oldFolder = folders.get(oldFolderId);
      oldFolder.documentCount = Math.max(0, oldFolder.documentCount - 1);
      folders.set(oldFolderId, oldFolder);
    }
    
    if (folderId && folders.has(folderId)) {
      const newFolder = folders.get(folderId);
      newFolder.documentCount += 1;
      folders.set(folderId, newFolder);
    }
    
    if (oldFolderId || folderId) {
      saveFolders(folders);
    }
    
    if (updatedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    console.log(`✅ Successfully moved document: ${documentInfo?.title} (${updatedCount} chunks)`);
    
    res.json({
      success: true,
      updatedChunks: updatedCount,
      documentInfo,
      oldFolderId,
      newFolderId: folderId
    });
    
  } catch (error) {
    console.error('📁 Document move error:', error);
    res.status(500).json({
      error: 'Failed to move document',
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