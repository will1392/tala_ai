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
import CloudStorageService from './services/cloudStorage.js';

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

// Initialize cloud storage service
const cloudStorage = new CloudStorageService();

// Test cloud storage connection on startup
(async () => {
  if (process.env.STORAGE_TYPE && process.env.STORAGE_TYPE !== 'local') {
    try {
      await cloudStorage.testConnection();
      console.log(`✅ Cloud storage (${process.env.STORAGE_TYPE}) connection verified`);
    } catch (error) {
      console.error(`❌ Cloud storage connection failed:`, error.message);
      console.error(`⚠️  Falling back to local storage`);
    }
  } else {
    console.log(`📁 Using local storage (uploads directory)`);
  }
})();

// Create uploads directory if it doesn't exist
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

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
    fileSize: 500 * 1024 * 1024, // 500MB limit (increased from 10MB)
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

// In-memory conversation storage (in production, use a proper database)
const conversations = new Map();
const conversationMessages = new Map();

// Save conversations to file (simple persistence)
function saveConversations() {
  try {
    const conversationsData = {
      conversations: Array.from(conversations.entries()),
      messages: Array.from(conversationMessages.entries())
    };
    fs.writeFileSync(path.join(__dirname, 'conversations.json'), JSON.stringify(conversationsData, null, 2));
  } catch (error) {
    console.error('Failed to save conversations:', error);
  }
}

// Load conversations from file
function loadConversations() {
  try {
    const filePath = path.join(__dirname, 'conversations.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data.conversations) {
        conversations.clear();
        data.conversations.forEach(([key, value]) => conversations.set(key, value));
      }
      if (data.messages) {
        conversationMessages.clear();
        data.messages.forEach(([key, value]) => conversationMessages.set(key, value));
      }
      console.log(`📚 Loaded ${conversations.size} conversations with ${conversationMessages.size} message threads`);
    }
  } catch (error) {
    console.error('Failed to load conversations:', error);
  }
}

// Initialize conversations on startup
loadConversations();

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
  console.log(`🔍 Extracting text from ${filename} (${mimetype}, ${buffer.length} bytes)`);
  
  try {
    let extractedText = '';
    
    switch (mimetype) {
      case 'application/pdf':
        console.log(`📄 Processing PDF: ${filename}`);
        const pdfData = await PDFParse(buffer);
        extractedText = pdfData.text;
        console.log(`✅ PDF text extracted: ${extractedText.length} characters`);
        break;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        console.log(`📝 Processing Word document: ${filename}`);
        const wordResult = await mammoth.extractRawText({ buffer });
        extractedText = wordResult.value;
        console.log(`✅ Word text extracted: ${extractedText.length} characters`);
        break;
        
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        console.log(`📊 Processing Excel document: ${filename}`);
        const workbook = XLSX.read(buffer);
        let text = '';
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const csvData = XLSX.utils.sheet_to_csv(sheet);
          text += `Sheet: ${sheetName}\\n${csvData}\\n\\n`;
        });
        extractedText = text;
        console.log(`✅ Excel text extracted: ${extractedText.length} characters from ${workbook.SheetNames.length} sheets`);
        break;
        
      case 'text/plain':
        console.log(`📃 Processing text file: ${filename}`);
        extractedText = buffer.toString('utf-8');
        console.log(`✅ Text file processed: ${extractedText.length} characters`);
        break;
        
      default:
        console.error(`❌ Unsupported file type: ${mimetype} for file: ${filename}`);
        throw new Error(`Unsupported file type: ${mimetype}`);
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      console.warn(`⚠️ No text content extracted from ${filename}`);
      throw new Error(`No text content found in ${filename}`);
    }
    
    console.log(`✅ Successfully extracted ${extractedText.length} characters from ${filename}`);
    return extractedText;
    
  } catch (error) {
    console.error(`❌ Error extracting text from ${filename}:`, error);
    console.error(`❌ Error details:`, {
      message: error.message,
      stack: error.stack?.split('\\n')[0],
      mimetype,
      bufferSize: buffer.length
    });
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
const foldersFilePath = path.join(__dirname, 'folders.json');

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
    const { name, description, userId, isAdmin = false, primaryFolderId } = req.body;
    
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
      isAdmin,
      primaryFolderId: primaryFolderId || null
    };

    folders.set(folderId, folder);
    saveFolders(folders);
    
    // Update primary folder counts if this folder belongs to a primary folder
    if (primaryFolderId) {
      updatePrimaryFolderCounts();
    }
    
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

    // Store primaryFolderId before deleting
    const deletedFolderPrimaryId = folder.primaryFolderId;
    
    folders.delete(folderId);
    saveFolders(folders);
    
    // Update primary folder counts if this folder belonged to a primary folder
    if (deletedFolderPrimaryId) {
      updatePrimaryFolderCounts();
    }
    
    console.log(`📁 Deleted folder: ${folder.name} (ID: ${folderId})`);
    res.json({ success: true });
  } catch (error) {
    console.error('📁 Folder deletion error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Move folder to new parent
app.put('/api/folders/:folderId/move', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { newParentId, newParentType, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    if (!newParentId || !newParentType) {
      return res.status(400).json({ error: 'newParentId and newParentType are required' });
    }
    
    if (!['primary', 'subfolder'].includes(newParentType)) {
      return res.status(400).json({ error: 'newParentType must be "primary" or "subfolder"' });
    }

    const folder = folders.get(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folder.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Store old primary folder ID for count updates
    const oldPrimaryFolderId = folder.primaryFolderId;
    
    // Validate new parent exists
    if (newParentType === 'primary') {
      const primaryFolder = primaryFolders.get(newParentId);
      if (!primaryFolder) {
        return res.status(404).json({ error: 'Target primary folder not found' });
      }
      
      // Check if user can create in this primary folder
      if (!primaryFolder.permissions.canCreate) {
        return res.status(403).json({ error: 'Cannot create folders in this primary folder' });
      }
      
      // Update folder's primary folder ID
      folder.primaryFolderId = newParentId;
    } else if (newParentType === 'subfolder') {
      const parentFolder = folders.get(newParentId);
      if (!parentFolder) {
        return res.status(404).json({ error: 'Target parent folder not found' });
      }
      
      // Prevent circular references
      if (newParentId === folderId) {
        return res.status(400).json({ error: 'Cannot move folder into itself' });
      }
      
      // Update folder's primary folder to match parent's primary folder
      folder.primaryFolderId = parentFolder.primaryFolderId;
    }
    
    folder.updatedAt = new Date().toISOString();
    folders.set(folderId, folder);
    saveFolders(folders);
    
    // Update primary folder counts for both old and new primary folders
    updatePrimaryFolderCounts();
    
    console.log(`📁 Moved folder: ${folder.name} (ID: ${folderId}) to ${newParentType} ${newParentId}`);
    res.json(folder);
  } catch (error) {
    console.error('📁 Folder move error:', error);
    res.status(500).json({ error: 'Failed to move folder' });
  }
});

// Primary Folder Management System
const primaryFoldersFilePath = path.join(__dirname, 'primaryFolders.json');

// Default primary folders configuration
const DEFAULT_PRIMARY_FOLDERS = [
  {
    slug: 'destinations',
    name: 'Destinations',
    description: 'Travel destination guides, requirements, and information',
    icon: 'MapPin',
    color: '#10b981',
    order: 1,
    permissions: {
      visibility: 'public',
      canCreate: true,
      canUpload: true,
      canEdit: false
    },
    isSystem: true
  },
  {
    slug: 'suppliers',
    name: 'Suppliers',
    description: 'Hotel, airline, and service provider information',
    icon: 'Building',
    color: '#3b82f6',
    order: 2,
    permissions: {
      visibility: 'public',
      canCreate: true,
      canUpload: true,
      canEdit: false
    },
    isSystem: true
  },
  {
    slug: 'policies-regulations',
    name: 'Policies & Regulations',
    description: 'Travel policies, visa requirements, and regulatory information',
    icon: 'FileText',
    color: '#f59e0b',
    order: 3,
    permissions: {
      visibility: 'public',
      canCreate: true,
      canUpload: true,
      canEdit: false
    },
    isSystem: true
  },
  {
    slug: 'marketing-materials',
    name: 'Marketing Materials',
    description: 'Brochures, promotional content, and marketing assets',
    icon: 'Megaphone',
    color: '#ec4899',
    order: 4,
    permissions: {
      visibility: 'admin-only',
      canCreate: true,
      canUpload: true,
      canEdit: false
    },
    isSystem: true
  },
  {
    slug: 'miscellaneous',
    name: 'Miscellaneous',
    description: 'Other documents and files that don\'t fit into specific categories',
    icon: 'Archive',
    color: '#6b7280',
    order: 5,
    permissions: {
      visibility: 'public',
      canCreate: true,
      canUpload: true,
      canEdit: false
    },
    isSystem: true
  }
];

// Load primary folders from file
function loadPrimaryFolders() {
  try {
    if (fs.existsSync(primaryFoldersFilePath)) {
      const data = fs.readFileSync(primaryFoldersFilePath, 'utf8');
      const primaryFoldersArray = JSON.parse(data);
      const primaryFoldersMap = new Map();
      primaryFoldersArray.forEach(folder => primaryFoldersMap.set(folder.id, folder));
      console.log(`🗂️ Loaded ${primaryFoldersArray.length} primary folders from storage`);
      return primaryFoldersMap;
    }
  } catch (error) {
    console.warn('Failed to load primary folders:', error);
  }
  return new Map();
}

// Save primary folders to file
function savePrimaryFolders(primaryFoldersMap) {
  try {
    const primaryFoldersArray = Array.from(primaryFoldersMap.values());
    fs.writeFileSync(primaryFoldersFilePath, JSON.stringify(primaryFoldersArray, null, 2));
    console.log(`🗂️ Saved ${primaryFoldersArray.length} primary folders to storage`);
  } catch (error) {
    console.error('Failed to save primary folders:', error);
  }
}

// Update primary folder counts
function updatePrimaryFolderCounts() {
  for (const [primaryFolderId, primaryFolder] of primaryFolders.entries()) {
    const subFolders = Array.from(folders.values()).filter(f => f.primaryFolderId === primaryFolderId);
    primaryFolder.subFolderCount = subFolders.length;
    primaryFolder.updatedAt = new Date().toISOString();
  }
  savePrimaryFolders(primaryFolders);
}

// Initialize primary folders from persistent storage
const primaryFolders = loadPrimaryFolders();

// Initialize default primary folders if none exist
if (primaryFolders.size === 0) {
  console.log('🗂️ No primary folders found, creating default folders...');
  const adminUserId = 'admin-1'; // Default admin user
  
  DEFAULT_PRIMARY_FOLDERS.forEach((folderConfig, index) => {
    const primaryFolderId = uuidv4();
    const primaryFolder = {
      id: primaryFolderId,
      ...folderConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: adminUserId,
      subFolderCount: 0,
      documentCount: 0,
      totalSize: 0
    };
    
    primaryFolders.set(primaryFolderId, primaryFolder);
  });
  
  savePrimaryFolders(primaryFolders);
  console.log(`🗂️ Created ${DEFAULT_PRIMARY_FOLDERS.length} default primary folders`);
}

// Update primary folder counts on startup
updatePrimaryFolderCounts();

// Primary Folder API Routes

// Get all primary folders
app.get('/api/primary-folders', async (req, res) => {
  try {
    const { userId, isAdmin = 'false' } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const userIsAdmin = isAdmin === 'true';
    const primaryFoldersArray = Array.from(primaryFolders.values())
      .filter(folder => {
        // Filter based on permissions
        if (folder.permissions.visibility === 'public') return true;
        if (folder.permissions.visibility === 'admin-only') return userIsAdmin;
        // For role-based, we'll implement proper role checking later
        return true;
      })
      .map(folder => {
        // Calculate real-time counts
        const subFolders = Array.from(folders.values()).filter(f => f.primaryFolderId === folder.id);
        const subFolderCount = subFolders.length;
        
        // For document count, we'd need to scan all documents, but for now let's set it to 0
        // This would require scanning all Qdrant collections which is expensive
        const documentCount = 0; // TODO: Calculate actual document count
        
        return {
          ...folder,
          subFolderCount,
          documentCount
        };
      })
      .sort((a, b) => a.order - b.order);

    res.json(primaryFoldersArray);
  } catch (error) {
    console.error('🗂️ Primary folder fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch primary folders' });
  }
});

// Create primary folder (admin only)
app.post('/api/primary-folders', async (req, res) => {
  try {
    const { slug, name, description, icon, color, order, permissions, userId } = req.body;
    
    if (!slug || !name || !userId) {
      return res.status(400).json({ error: 'Slug, name, and userId are required' });
    }

    // Check if slug already exists
    const existingFolder = Array.from(primaryFolders.values()).find(f => f.slug === slug);
    if (existingFolder) {
      return res.status(400).json({ error: 'A primary folder with this slug already exists' });
    }

    const primaryFolderId = uuidv4();
    const primaryFolder = {
      id: primaryFolderId,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      name: name.trim(),
      description: description?.trim(),
      icon: icon || 'Folder',
      color: color || '#6b7280',
      order: order || Array.from(primaryFolders.values()).length + 1,
      permissions: {
        visibility: 'public',
        canCreate: true,
        canUpload: true,
        canEdit: false,
        ...permissions
      },
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId,
      subFolderCount: 0,
      documentCount: 0,
      totalSize: 0
    };

    primaryFolders.set(primaryFolderId, primaryFolder);
    savePrimaryFolders(primaryFolders);
    
    console.log(`🗂️ Created primary folder: ${name} (ID: ${primaryFolderId})`);
    res.json(primaryFolder);
  } catch (error) {
    console.error('🗂️ Primary folder creation error:', error);
    res.status(500).json({ error: 'Failed to create primary folder' });
  }
});

// Update primary folder
app.put('/api/primary-folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, name, description, icon, color, order, permissions, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const primaryFolder = primaryFolders.get(id);
    if (!primaryFolder) {
      return res.status(404).json({ error: 'Primary folder not found' });
    }

    // System folders can only be updated by their creator or admin
    if (primaryFolder.isSystem && primaryFolder.userId !== userId) {
      return res.status(403).json({ error: 'Cannot edit system primary folder' });
    }

    // Check slug uniqueness if it's being changed
    if (slug && slug !== primaryFolder.slug) {
      const existingFolder = Array.from(primaryFolders.values()).find(f => f.slug === slug && f.id !== id);
      if (existingFolder) {
        return res.status(400).json({ error: 'A primary folder with this slug already exists' });
      }
    }

    const updatedFolder = {
      ...primaryFolder,
      ...(slug && { slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-') }),
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() }),
      ...(icon && { icon }),
      ...(color && { color }),
      ...(order !== undefined && { order }),
      ...(permissions && { permissions: { ...primaryFolder.permissions, ...permissions } }),
      updatedAt: new Date().toISOString()
    };

    primaryFolders.set(id, updatedFolder);
    savePrimaryFolders(primaryFolders);
    
    console.log(`🗂️ Updated primary folder: ${updatedFolder.name} (ID: ${id})`);
    res.json(updatedFolder);
  } catch (error) {
    console.error('🗂️ Primary folder update error:', error);
    res.status(500).json({ error: 'Failed to update primary folder' });
  }
});

// Delete primary folder
app.delete('/api/primary-folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const primaryFolder = primaryFolders.get(id);
    if (!primaryFolder) {
      return res.status(404).json({ error: 'Primary folder not found' });
    }

    // Cannot delete system folders
    if (primaryFolder.isSystem) {
      return res.status(403).json({ error: 'Cannot delete system primary folder' });
    }

    // Only creator can delete
    if (primaryFolder.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this primary folder' });
    }

    primaryFolders.delete(id);
    savePrimaryFolders(primaryFolders);
    
    console.log(`🗂️ Deleted primary folder: ${primaryFolder.name} (ID: ${id})`);
    res.json({ success: true });
  } catch (error) {
    console.error('🗂️ Primary folder deletion error:', error);
    res.status(500).json({ error: 'Failed to delete primary folder' });
  }
});

// Get folder hierarchy (primary folder with its sub-folders)
app.get('/api/primary-folders/:id/hierarchy', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, isAdmin = 'false' } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const primaryFolder = primaryFolders.get(id);
    if (!primaryFolder) {
      return res.status(404).json({ error: 'Primary folder not found' });
    }

    // Get all sub-folders for this primary folder
    const subFolders = Array.from(folders.values()).filter(folder => {
      // This will need to be updated when we add primaryFolderId to regular folders
      return folder.primaryFolderId === id;
    });

    res.json({
      primaryFolder,
      subFolders
    });
  } catch (error) {
    console.error('🗂️ Folder hierarchy error:', error);
    res.status(500).json({ error: 'Failed to fetch folder hierarchy' });
  }
});

// Upload document
app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, isAdmin = 'false', folderId, primaryFolderId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log(`📄 Processing upload for user ${userId} (admin: ${isAdmin}) to folder: ${folderId || 'none'}, primaryFolder: ${primaryFolderId || 'none'}`);
    
    // Validate primary folder if provided
    let primaryFolder = null;
    if (primaryFolderId) {
      primaryFolder = primaryFolders.get(primaryFolderId);
      console.log(`🗂️ Primary folder details:`, primaryFolder ? { id: primaryFolder.id, name: primaryFolder.name } : 'Primary folder not found');
      
      if (!primaryFolder) {
        return res.status(400).json({ error: 'Primary folder not found' });
      }
      
      // Check upload permissions
      if (!primaryFolder.permissions.canUpload) {
        return res.status(403).json({ error: 'Upload not allowed in this primary folder' });
      }
    }
    
    // Validate sub-folder if provided
    if (folderId) {
      const folder = folders.get(folderId);
      console.log(`📁 Sub-folder details:`, folder ? { id: folder.id, name: folder.name } : 'Sub-folder not found');
      
      if (!folder) {
        return res.status(400).json({ error: 'Sub-folder not found' });
      }
    }
    
    const file = req.file;
    const documentId = uuidv4();
    const collectionName = getCollectionName(userId, isAdmin === 'true');
    
    // Debug file details
    console.log(`📎 File details:`, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      documentId: documentId
    });
    
    // Ensure collection exists
    await ensureCollectionExists(collectionName);
    
    // Save original file for PDFs
    let fileUrl = null;
    let storageProvider = process.env.STORAGE_TYPE || 'local';
    let storageKey = null;
    console.log(`📁 Storage provider: ${storageProvider}`);
    console.log(`📁 Checking mimetype: "${file.mimetype}" === "application/pdf"? ${file.mimetype === 'application/pdf'}`);
    
    if (file.mimetype === 'application/pdf') {
      const filename = `${documentId}-${file.originalname}`;
      console.log(`📁 File buffer size: ${file.buffer.length} bytes`);
      
      try {
        // Use cloud storage service
        if (storageProvider !== 'local') {
          const uploadResult = await cloudStorage.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            documentId
          );
          console.log(`✅ PDF uploaded to ${storageProvider}: ${uploadResult.url}`);
          fileUrl = uploadResult.url;
          storageKey = uploadResult.key; // Use the full S3 key including documents/ prefix
        } else {
          // Fallback to local storage
          const filepath = path.join(uploadsDir, filename);
          console.log(`📁 Saving PDF locally to: ${filepath}`);
          fs.writeFileSync(filepath, file.buffer);
          console.log(`✅ PDF saved locally: ${filename}`);
          fileUrl = `/api/files/${filename}`;
          storageKey = null; // No storage key for local files
          
          // Verify file was saved
          if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            console.log(`✅ File verified - size: ${stats.size} bytes`);
          } else {
            console.error(`❌ File not found after save: ${filepath}`);
          }
        }
      } catch (saveError) {
        console.error(`❌ Failed to save PDF:`, saveError);
        // Fallback to local storage if cloud fails
        if (storageProvider !== 'local') {
          try {
            const filepath = path.join(uploadsDir, filename);
            fs.writeFileSync(filepath, file.buffer);
            fileUrl = `/api/files/${filename}`;
            storageProvider = 'local';
            storageKey = null; // No storage key for local fallback
            console.log(`⚠️ Fell back to local storage due to cloud error`);
          } catch (localError) {
            console.error(`❌ Failed to save to local storage as well:`, localError);
          }
        }
      }
    } else {
      console.log(`⚠️ File is not a PDF, mimetype: ${file.mimetype}`);
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
              category: primaryFolder?.slug || 'general',
              chunkIndex: chunk.metadata.chunkIndex,
              wordCount: chunk.metadata.wordCount,
              headings: [], // Could be enhanced with heading extraction
              folderId: folderId || null,
              folderName: folderId ? folders.get(folderId)?.name : null,
              primaryFolderId: primaryFolderId || null,
              primaryFolderName: primaryFolder?.name || null,
              primaryFolderSlug: primaryFolder?.slug || null
            },
            document: {
              originalName: file.originalname,
              fileType: file.mimetype,
              uploadedAt: new Date().toISOString(),
              fileSize: file.size,
              userId: userId,
              isAdminDocument: isAdmin === 'true',
              fileUrl: fileUrl,
              storageProvider: storageProvider,
              storageKey: storageKey
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
    
    // Update folder document counts
    if (folderId && folders.has(folderId)) {
      const folder = folders.get(folderId);
      folder.documentCount += 1;
      folders.set(folderId, folder);
      saveFolders(folders);
    }
    
    // Update primary folder document count
    if (primaryFolderId && primaryFolders.has(primaryFolderId)) {
      const primaryFolderToUpdate = primaryFolders.get(primaryFolderId);
      primaryFolderToUpdate.documentCount += 1;
      primaryFolderToUpdate.updatedAt = new Date().toISOString();
      primaryFolders.set(primaryFolderId, primaryFolderToUpdate);
      savePrimaryFolders(primaryFolders);
    }

    console.log(`✅ Stored ${points.length} vectors for document: ${file.originalname}`);
    
    res.json({
      documentId,
      chunksStored: points.length,
      filename: file.originalname,
      collectionName,
      isAdminDocument: isAdmin === 'true',
      folderId: folderId || null,
      primaryFolderId: primaryFolderId || null,
      primaryFolderName: primaryFolder?.name || null
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

// Tala AI Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId, isAdmin = false, conversationId, maxResults = 5 } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json({ error: 'Message and userId are required' });
    }

    console.log(`💬 Chat request from user ${userId}: "${message.substring(0, 100)}..."`); 
    
    const collectionName = getCollectionName(userId, isAdmin);
    
    // Step 1: Search relevant documents using Tala AI
    console.log('🔍 Searching knowledge base for relevant context...');
    const queryEmbedding = await generateEmbedding(message);
    
    const searchResults = await qdrant.search(collectionName, {
      vector: queryEmbedding,
      limit: maxResults,
      score_threshold: 0.3
    });
    
    console.log(`📊 Found ${searchResults.length} relevant documents`);
    
    // Step 2: Prepare context from search results
    const contextChunks = searchResults.map(result => ({
      content: result.payload.content,
      title: result.payload.metadata?.title || 'Unknown Document',
      score: result.score,
      documentId: result.payload.documentId
    }));
    
    const context = contextChunks
      .map(chunk => `Document: ${chunk.title}\nContent: ${chunk.content}`)
      .join('\n\n---\n\n');
    
    // Step 3: Generate AI response using Tala AI
    const systemPrompt = `You are Tala, an AI travel assistant with access to a comprehensive knowledge base of travel documents, visa requirements, airline policies, and destination information.

Your role:
- Provide helpful, accurate travel advice based on the provided context
- If the context doesn't contain relevant information, acknowledge this and provide general guidance
- Always be friendly, professional, and travel-focused
- Cite specific documents when possible
- Use markdown formatting for better readability

Context from knowledge base:
${context || 'No relevant documents found in the knowledge base.'}`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    // Step 4: Prepare sources for the response
    const sources = contextChunks.map(chunk => ({
      title: chunk.title,
      type: 'document',
      score: chunk.score,
      documentId: chunk.documentId
    }));
    
    console.log(`✅ Generated AI response (${aiResponse?.length} chars) with ${sources.length} sources`);
    
    // Step 5: Handle conversation storage
    const finalConversationId = conversationId || `conv_${Date.now()}_${userId}`;
    
    // Store/update conversation metadata
    const conversation = conversations.get(finalConversationId) || {
      id: finalConversationId,
      userId: userId,
      title: message.length > 50 ? message.substring(0, 50) + '...' : message,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 0
    };
    
    // Update conversation metadata
    conversation.lastActivity = new Date().toISOString();
    conversation.lastMessage = aiResponse.length > 100 ? aiResponse.substring(0, 100) + '...' : aiResponse;
    conversation.messageCount += 2; // User message + AI response
    conversations.set(finalConversationId, conversation);
    
    // Store messages
    const messages = conversationMessages.get(finalConversationId) || [];
    
    // Add user message
    messages.push({
      id: `user_${Date.now()}`,
      content: message,
      sender: 'user',
      timestamp: new Date().toISOString(),
      conversationId: finalConversationId
    });
    
    // Add AI response
    messages.push({
      id: `ai_${Date.now()}`,
      content: aiResponse,
      sender: 'tala',
      timestamp: new Date().toISOString(),
      sources: sources,
      conversationId: finalConversationId,
      tokensUsed: completion.usage?.total_tokens || 0
    });
    
    conversationMessages.set(finalConversationId, messages);
    
    // Save to file
    saveConversations();
    
    console.log(`💾 Saved conversation ${finalConversationId} with ${messages.length} messages`);
    
    // Step 6: Return response with metadata
    res.json({
      response: aiResponse,
      sources: sources,
      contextUsed: contextChunks.length > 0,
      conversationId: finalConversationId,
      timestamp: new Date().toISOString(),
      tokensUsed: completion.usage?.total_tokens || 0
    });
    
  } catch (error) {
    console.error('💬 Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

// Get chat history
app.get('/api/chat/history/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Get conversation metadata
    const conversation = conversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get messages for this conversation
    const messages = conversationMessages.get(conversationId) || [];
    
    console.log(`📜 Retrieved ${messages.length} messages for conversation ${conversationId}`);
    
    res.json({
      conversationId,
      conversation,
      messages,
      lastActivity: conversation.lastActivity
    });
    
  } catch (error) {
    console.error('📝 Chat history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve chat history',
      details: error.message
    });
  }
});

// List user conversations
app.get('/api/chat/conversations', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Get user's conversations, sorted by last activity (most recent first)
    const userConversations = Array.from(conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, 15); // Limit to last 15 conversations
    
    console.log(`📋 Retrieved ${userConversations.length} conversations for user ${userId}`);
    
    res.json({
      conversations: userConversations
    });
    
  } catch (error) {
    console.error('📋 Conversations list error:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversations',
      details: error.message
    });
  }
});

// Delete a conversation
app.delete('/api/chat/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Check if conversation exists and belongs to user
    const conversation = conversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Delete conversation and its messages
    conversations.delete(conversationId);
    conversationMessages.delete(conversationId);
    
    // Save changes
    saveConversations();
    
    console.log(`🗑️ Deleted conversation ${conversationId}`);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('🗑️ Delete conversation error:', error);
    res.status(500).json({
      error: 'Failed to delete conversation',
      details: error.message
    });
  }
});

// Search documents
app.post('/api/documents/search', async (req, res) => {
  try {
    const { query, userId, isAdmin = false, limit = 10, scoreThreshold = 0.2, folderId, primaryFolderId, category, fileType } = req.body;
    
    if (!query || !userId) {
      return res.status(400).json({ error: 'Query and userId are required' });
    }
    
    console.log(`🔍 Enhanced search request:`, {
      query: query.substring(0, 50),
      userId: userId.substring(0, 8),
      folderId,
      primaryFolderId,
      category,
      fileType,
      limit
    });
    
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
        
        // Build search filters
        const searchFilter = { must: [] };
        
        // Filter by primary folder
        if (primaryFolderId && primaryFolderId !== 'all') {
          searchFilter.must.push({
            key: 'metadata.primaryFolderId',
            match: { value: primaryFolderId }
          });
        }
        
        // Filter by sub-folder
        if (folderId && folderId !== 'all') {
          searchFilter.must.push({
            key: 'metadata.folderId',
            match: { value: folderId }
          });
        }
        
        // Filter by category
        if (category) {
          searchFilter.must.push({
            key: 'metadata.category',
            match: { value: category }
          });
        }
        
        // Filter by file type
        if (fileType) {
          searchFilter.must.push({
            key: 'document.fileType',
            match: { value: fileType }
          });
        }

        const searchResult = await qdrant.search(collectionName, {
          vector: queryVector,
          limit: Math.ceil(limit / collectionsToSearch.length) + 5,
          with_payload: true,
          with_vector: false,
          filter: searchFilter.must.length > 0 ? searchFilter : undefined
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
    const { userId, isAdmin = 'false', folderId, primaryFolderId, limit = 50, offset = 0 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    console.log(`📄 Getting documents for user ${userId} (admin: ${isAdmin}), folder: ${folderId || 'all'}, primaryFolder: ${primaryFolderId || 'all'}, limit: ${limit}`);
    
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
          // Build filter conditions
          const filterConditions = [];
          
          if (folderId && folderId !== 'all') {
            filterConditions.push({
              key: 'folderId',
              match: { value: folderId }
            });
          }
          
          if (primaryFolderId && primaryFolderId !== 'all') {
            filterConditions.push({
              key: 'primaryFolderId',
              match: { value: primaryFolderId }
            });
          }
          
          if (filterConditions.length > 0) {
            scrollRequest.filter = {
              must: filterConditions
            };
            console.log(`📄 Filtering by conditions:`, filterConditions);
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
            const pointPrimaryFolderId = point.payload.metadata?.primaryFolderId;
            
            console.log(`📄 Point folder info:`, {
              docId: docId.substring(0, 8),
              pointFolderId,
              pointPrimaryFolderId,
              requestedFolderId: folderId,
              requestedPrimaryFolderId: primaryFolderId,
              title: point.payload.metadata?.title || point.payload.document?.originalName
            });
            
            // Filter out documents that don't match the folder when folder is specified
            if (folderId && folderId !== 'all' && pointFolderId !== folderId) {
              console.log(`📄 Skipping document - folder mismatch`);
              return;
            }
            
            // Filter out documents that don't match the primary folder when primary folder is specified
            if (primaryFolderId && primaryFolderId !== 'all' && pointPrimaryFolderId !== primaryFolderId) {
              console.log(`📄 Skipping document - primary folder mismatch`);
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
                primaryFolderId: point.payload.metadata?.primaryFolderId || null,
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
            title: firstPoint.payload?.metadata?.title || firstPoint.payload?.document?.originalName,
            fileUrl: firstPoint.payload?.document?.fileUrl,
            storageProvider: firstPoint.payload?.document?.storageProvider || 'local',
            storageKey: firstPoint.payload?.document?.storageKey
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
    
    // Delete the PDF file from storage if it exists
    if (documentInfo?.fileUrl) {
      try {
        if (documentInfo.storageProvider === 'local') {
          // Delete from local storage
          const filename = documentInfo.fileUrl.replace('/api/files/', '');
          const filepath = path.join(uploadsDir, filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`🗑️ Deleted local file: ${filename}`);
          }
        } else if (documentInfo.storageKey) {
          // Delete from cloud storage
          await cloudStorage.deleteFile(documentInfo.storageKey);
          console.log(`🗑️ Deleted file from ${documentInfo.storageProvider}: ${documentInfo.storageKey}`);
        }
      } catch (fileDeleteError) {
        console.error(`❌ Failed to delete file from storage:`, fileDeleteError);
        // Continue even if file deletion fails
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
    const { userId, isAdmin = 'false', folderId, primaryFolderId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    console.log(`📁 Moving document: ${documentId} to folder: ${folderId || 'root'}, primaryFolder: ${primaryFolderId || 'none'} for user ${userId}`);
    
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
              folderName: folderId ? folders.get(folderId)?.name : null,
              primaryFolderId: primaryFolderId || null
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

// Get signed URL for secure file access
app.get('/api/documents/:documentId/url', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId, isAdmin = 'false' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Determine collections to search
    const collectionsToSearch = [];
    if (isAdmin === 'true') {
      collectionsToSearch.push('tala_admin_knowledge');
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

    // Find the document
    let documentInfo = null;
    for (const collectionName of collectionsToSearch) {
      try {
        const collections = await qdrant.getCollections();
        const exists = collections.collections.some(c => c.name === collectionName);
        if (!exists) continue;

        const scrollResult = await qdrant.scroll(collectionName, {
          filter: {
            must: [{
              key: 'documentId',
              match: { value: documentId }
            }]
          },
          limit: 1,
          with_payload: true,
          with_vector: false
        });

        if (scrollResult.points.length > 0) {
          const point = scrollResult.points[0];
          documentInfo = {
            fileUrl: point.payload?.document?.fileUrl,
            storageProvider: point.payload?.document?.storageProvider || 'local',
            storageKey: point.payload?.document?.storageKey,
            originalName: point.payload?.document?.originalName
          };
          break;
        }
      } catch (error) {
        console.warn(`Failed to search collection ${collectionName}:`, error.message);
      }
    }

    if (!documentInfo) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate appropriate URL
    let accessUrl = documentInfo.fileUrl;

    if (documentInfo.storageProvider === 's3' && documentInfo.storageKey) {
      // Generate signed URL for S3
      try {
        accessUrl = await cloudStorage.getSignedUrl(documentInfo.storageKey, 3600); // 1 hour expiry
        console.log(`🔗 Generated signed URL for document ${documentId}`);
      } catch (error) {
        console.error(`❌ Failed to generate signed URL for ${documentId}:`, error);
        return res.status(500).json({ error: 'Failed to generate access URL' });
      }
    }

    res.json({
      url: accessUrl,
      expiresIn: documentInfo.storageProvider === 's3' ? 3600 : null,
      storageProvider: documentInfo.storageProvider
    });

  } catch (error) {
    console.error('🔗 URL generation error:', error);
    res.status(500).json({
      error: 'Failed to generate document URL',
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
      return res.status(400).json({ error: 'File too large. Maximum size is 500MB.' });
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