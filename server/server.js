import express from 'express';
import cors from 'cors';
import session from 'express-session';
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
import LLMRouter from './services/llm/LLMRouter.js';
import metricsRoutes from './api-metrics-endpoint.js';
import ChatService from './services/chatService.js';
import { getSupabaseHealth } from './db/supabaseClient.js';
import { logDatabaseStatus } from './config/database.js';

// Import new database and middleware components
import { initializeRedis } from './config/redis.js';
import { initializeAuth, authenticate, optionalAuth } from './middleware/authentication.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler, asyncHandler } from './utils/errorHandler.js';

// Import authentication components
import authManager from './auth/AuthManager.js';
import { getAuthConfig } from './config/auth.js';

// Import database services
import { ConversationService } from './services/db/conversationService.js';
import { DocumentService } from './services/db/documentService.js';
import { FolderService } from './services/db/folderService.js';

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

// Initialize LLM Router with feature flag
let llmRouter = null;
const enableMultiLLM = process.env.ENABLE_MULTI_LLM === 'true';

if (enableMultiLLM) {
  console.log('🤖 Initializing Multi-LLM Router...');
  llmRouter = new LLMRouter({
    enableLogging: true,
    enableMonitoring: true,
    enableCostOptimization: true,
    enableHealthChecks: true,
    dailyBudget: parseFloat(process.env.DAILY_LLM_BUDGET) || 50.00,
    monthlyBudget: parseFloat(process.env.MONTHLY_LLM_BUDGET) || 1000.00,
    fallbackChain: (process.env.LLM_FALLBACK_CHAIN || 'gpt-4o-mini,claude-sonnet-4-20250514,gemini-2.5-flash,grok-3-latest').split(',')
  });
} else {
  console.log('🔒 Multi-LLM routing disabled, using OpenAI only');
}

// Initialize Chat Service
const chatService = new ChatService({
  enableMultiLLM,
  llmRouter,
  openai,
  enableLogging: true
});

// Initialize database services
const conversationService = new ConversationService();
const documentService = new DocumentService();
const folderService = new FolderService();

// Initialize database connection and supporting services
(async () => {
  try {
    // Initialize Redis caching layer
    console.log('🔴 Initializing Redis caching layer...');
    const redisInfo = await initializeRedis();
    if (redisInfo.isConnected) {
      console.log('✅ Redis connected successfully');
    } else {
      console.log('⚠️  Redis not available - using in-memory fallback');
    }

    // Initialize authentication system
    console.log('🔐 Initializing authentication system...');
    await initializeAuth();
    
    // Initialize main AuthManager for routes
    console.log('🔐 Initializing main AuthManager...');
    const authConfig = getAuthConfig();
    await authManager.initialize(authConfig);
    console.log('✅ Main AuthManager initialized');
    
    // Test database connection
    const dbHealth = await getSupabaseHealth();
    if (dbHealth.status === 'healthy') {
      console.log('✅ Database connection verified');
      await logDatabaseStatus();
    } else {
      console.log('⚠️  Database not ready - using JSON fallback mode');
      console.log('💡 Run: node test-database-setup.js to configure database');
    }
  } catch (error) {
    console.log('⚠️  Database health check failed - using JSON fallback mode');
    console.error('Details:', error.message);
  }
})();

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

// Session middleware for OAuth token storage
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
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

// Add rate limiting middleware
app.use(rateLimiter.middleware('api'));

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
  try {
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  OpenAI API key not configured, skipping embedding generation');
      return null;
    }
    
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
  } catch (error) {
    console.error('❌ Failed to generate embedding:', error.message);
    return null;
  }
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

// Comprehensive health check endpoint
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    services: {},
    performance: {},
    summary: {
      healthy: 0,
      degraded: 0,
      unhealthy: 0
    }
  };

  // Check Database (PostgreSQL via Supabase)
  try {
    const dbStartTime = Date.now();
    const dbHealth = await getSupabaseHealth();
    const dbResponseTime = Date.now() - dbStartTime;
    
    health.services.database = {
      status: dbHealth.status,
      provider: 'Supabase PostgreSQL',
      responseTime: dbResponseTime,
      details: {
        url: process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing',
        connection: dbHealth.status,
        lastChecked: new Date().toISOString()
      }
    };
    
    if (dbHealth.status === 'healthy') {
      health.summary.healthy++;
    } else {
      health.summary.unhealthy++;
    }
  } catch (error) {
    health.services.database = {
      status: 'error',
      provider: 'Supabase PostgreSQL',
      error: error.message,
      responseTime: null
    };
    health.summary.unhealthy++;
  }

  // Check Redis Cache
  try {
    const redisStartTime = Date.now();
    const { redisHealthCheck } = await import('./config/redis.js');
    const redisHealth = await redisHealthCheck();
    const redisResponseTime = Date.now() - redisStartTime;
    
    health.services.redis = {
      status: redisHealth.status,
      provider: 'Redis Cache',
      responseTime: redisResponseTime,
      details: {
        connected: redisHealth.connected || false,
        latency: redisHealth.latency,
        fallbackMode: !redisHealth.connected,
        lastChecked: new Date().toISOString()
      }
    };
    
    if (redisHealth.status === 'healthy') {
      health.summary.healthy++;
    } else if (redisHealth.status === 'degraded') {
      health.summary.degraded++;
    } else {
      health.summary.unhealthy++;
    }
  } catch (error) {
    health.services.redis = {
      status: 'degraded',
      provider: 'Redis Cache',
      error: 'Fallback mode - Redis not available',
      responseTime: null
    };
    health.summary.degraded++;
  }

  // Check Qdrant Vector Database
  try {
    const qdrantStartTime = Date.now();
    const collections = await qdrant.getCollections();
    const qdrantResponseTime = Date.now() - qdrantStartTime;
    
    health.services.qdrant = {
      status: 'healthy',
      provider: 'Qdrant Vector DB',
      responseTime: qdrantResponseTime,
      details: {
        url: process.env.QDRANT_URL ? '✅ Configured' : '❌ Missing',
        collections: collections.collections?.length || 0,
        lastChecked: new Date().toISOString()
      }
    };
    health.summary.healthy++;
  } catch (error) {
    health.services.qdrant = {
      status: 'error',
      provider: 'Qdrant Vector DB',
      error: error.message,
      responseTime: null
    };
    health.summary.unhealthy++;
  }

  // Check LLM Services
  health.services.llm = {
    multiLLMEnabled: enableMultiLLM,
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google: !!process.env.GOOGLE_AI_API_KEY,
      grok: !!process.env.GROK_API_KEY
    }
  };

  if (enableMultiLLM && llmRouter) {
    health.services.llm.router = {
      status: 'healthy',
      uptime: Date.now() - llmRouter.routingStats.uptime,
      totalQueries: llmRouter.routingStats.totalQueries,
      healthyServices: llmRouter.getHealthyServiceCount(),
      totalServices: llmRouter.serviceHealth.size
    };
    health.summary.healthy++;
  } else {
    health.services.llm.router = {
      status: 'basic',
      provider: 'OpenAI only'
    };
    health.summary.healthy++;
  }

  // Check Chat Service
  try {
    const chatHealthStatus = chatService.getHealthStatus();
    health.services.chat = {
      status: 'healthy',
      provider: 'Tala Chat Service',
      details: chatHealthStatus
    };
    health.summary.healthy++;
  } catch (error) {
    health.services.chat = {
      status: 'error',
      provider: 'Tala Chat Service',
      error: error.message
    };
    health.summary.unhealthy++;
  }

  // Check Authentication Service
  try {
    const { MOCK_AUTH_CONFIG } = await import('./middleware/authentication.js');
    health.services.authentication = {
      status: 'healthy',
      provider: MOCK_AUTH_CONFIG.enabled ? 'Mock Auth (Development)' : 'Production Auth',
      details: {
        mockMode: MOCK_AUTH_CONFIG.enabled,
        initialized: true
      }
    };
    health.summary.healthy++;
  } catch (error) {
    health.services.authentication = {
      status: 'error',
      provider: 'Authentication Service',
      error: error.message
    };
    health.summary.unhealthy++;
  }

  // Check File Storage
  health.services.storage = {
    status: 'healthy',
    provider: process.env.STORAGE_TYPE || 'Local File System',
    details: {
      type: process.env.STORAGE_TYPE || 'local',
      configured: process.env.STORAGE_TYPE ? '✅ Cloud Storage' : '📁 Local Storage'
    }
  };
  health.summary.healthy++;

  // Calculate overall health status
  const totalServices = health.summary.healthy + health.summary.degraded + health.summary.unhealthy;
  const healthPercentage = (health.summary.healthy / totalServices) * 100;
  
  if (health.summary.unhealthy > 0) {
    health.status = 'unhealthy';
  } else if (health.summary.degraded > 0) {
    health.status = 'degraded';
  } else {
    health.status = 'healthy';
  }

  // Performance metrics
  const totalResponseTime = Date.now() - startTime;
  health.performance = {
    healthCheckDuration: totalResponseTime,
    memoryUsage: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    cpuUsage: process.cpuUsage(),
    systemUptime: process.uptime()
  };

  // Add summary statistics
  health.summary.healthPercentage = Math.round(healthPercentage);
  health.summary.totalServices = totalServices;
  health.summary.lastChecked = new Date().toISOString();

  // Set appropriate HTTP status based on health
  // Always return 200 if core services (qdrant, authentication, storage) are working
  // Only return 503 if critical services that have no fallback are down
  const coreServicesWorking = health.services.qdrant?.status === 'healthy' && 
                             health.services.authentication?.status === 'healthy' &&
                             health.services.storage?.status === 'healthy';
  
  const httpStatus = coreServicesWorking ? 200 : 503;

  res.status(httpStatus).json(health);
});

// LLM Metrics endpoint (only available when multi-LLM is enabled)
if (enableMultiLLM) {
  app.use('/api/llm', metricsRoutes);
}

// Authentication Routes
import authRouter from './routes/auth.js';
app.use('/auth', authRouter);

// API Key Management Routes
import apiKeysRouter from './routes/apiKeys.js';
app.use('/api/keys', apiKeysRouter);

// Profile Management Routes
import profilesRouter from './routes/profiles.js';
app.use('/api/profiles', profilesRouter);

// Conversation Threading Routes
import conversationsRouter from './routes/conversations.js';
app.use('/api/conversations', conversationsRouter);

// Email to Task Conversion Routes
import emailTaskRoutes from './routes/email-tasks-simple.js';
app.use('/api/email-tasks', emailTaskRoutes);

// Task Management Routes (if using native task management)
import taskRoutes from './routes/tasks.js';
app.use('/api/tasks', taskRoutes);

// Email Connection Routes
import emailConnectRoutes from './routes/email-connect.js';
app.use('/api/email', emailConnectRoutes);

// Folder Management Routes

// Create folder
app.post('/api/folders', authenticate, asyncHandler(async (req, res) => {
  const { name, description, parent_folder_id = null } = req.body;
  
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  const folderData = {
    organization_id: req.organizationId,
    user_id: req.userId,
    name: name.trim(),
    description: description?.trim() || null,
    parent_folder_id: parent_folder_id || null,
    folder_type: 'user'
  };

  const result = await folderService.createFolder(folderData);
  
  if (!result.success) {
    return res.status(500).json({ error: result.error || 'Failed to create folder' });
  }
  
  console.log(`📁 Created folder: ${name} (ID: ${result.data.id})`);
  res.json(result.data);
}));

// Get folders
app.get('/api/folders', authenticate, asyncHandler(async (req, res) => {
  const { parent_folder_id = null, include_admin = false } = req.query;
  
  const filters = {
    organization_id: req.organizationId,
    user_id: req.userId
  };
  
  if (parent_folder_id !== null) {
    filters.parent_folder_id = parent_folder_id || null;
  }
  
  // If include_admin is true and user has admin role, also get admin folders
  if (include_admin === 'true' && req.user.role === 'admin') {
    delete filters.user_id; // Remove user filter to get admin folders too
    filters.folder_type = ['user', 'admin'];
  }
  
  const result = await folderService.getFolders(filters, {
    organizationId: req.organizationId,
    orderBy: 'name'
  });
  
  const userFolders = result.success ? result.data : [];
  res.json(userFolders);
}));

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

// Extract data from documents without storing
app.post('/api/documents/extract', upload.array('document', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { extractType = 'summary', userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log(`🔍 Extracting data from ${req.files.length} files for user ${userId}, type: ${extractType}`);
    
    const results = {
      success: true,
      data: {
        metadata: {},
        summary: '',
        keyData: [],
        fullText: ''
      }
    };

    // Process each file
    for (const file of req.files) {
      try {
        let content = '';
        
        // Extract text based on file type
        if (file.mimetype === 'application/pdf') {
          const pdfData = await PDFParse(file.buffer);
          content = pdfData.text;
          
          // Add metadata for PDF
          results.data.metadata = {
            ...results.data.metadata,
            title: pdfData.info?.Title || file.originalname,
            author: pdfData.info?.Author,
            pages: pdfData.numpages,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            type: 'PDF'
          };
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const docxResult = await mammoth.extractRawText({ buffer: file.buffer });
          content = docxResult.value;
          
          results.data.metadata = {
            ...results.data.metadata,
            title: file.originalname,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            type: 'DOCX'
          };
        } else if (file.mimetype === 'text/plain') {
          content = file.buffer.toString('utf-8');
          
          results.data.metadata = {
            ...results.data.metadata,
            title: file.originalname,
            fileSize: `${(file.size / 1024).toFixed(2)} KB`,
            type: 'Text'
          };
        } else {
          console.log(`⚠️ Unsupported file type for extraction: ${file.mimetype}`);
          continue;
        }

        // Process content based on extraction type
        if (extractType === 'full-text') {
          results.data.fullText += content + '\n\n';
        } else {
          // Use OpenAI to extract summary or key data
          let prompt = '';
          if (extractType === 'summary') {
            prompt = `Please provide a concise summary of the following document content:\n\n${content.substring(0, 4000)}`;
          } else if (extractType === 'key-data') {
            prompt = `Please extract the key data points, important facts, and figures from the following document content. Format as structured data:\n\n${content.substring(0, 4000)}`;
          }

          try {
            const completion = await openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 1000,
              temperature: 0.3,
            });

            const extractedContent = completion.choices[0]?.message?.content || '';
            
            if (extractType === 'summary') {
              results.data.summary += extractedContent + '\n\n';
            } else if (extractType === 'key-data') {
              // Try to parse key data into structured format
              const lines = extractedContent.split('\n').filter(line => line.trim());
              lines.forEach(line => {
                const match = line.match(/(.+?):\s*(.+)/);
                if (match) {
                  results.data.keyData.push({
                    label: match[1].trim().replace(/^\*\*|\*\*$/g, '').replace(/^•\s*/, ''),
                    value: match[2].trim()
                  });
                }
              });
            }
          } catch (aiError) {
            console.error('AI extraction error:', aiError);
            // Fallback to raw content
            if (extractType === 'summary') {
              results.data.summary += content.substring(0, 500) + '...\n\n';
            }
          }
        }

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        continue;
      }
    }

    // Clean up results
    results.data.summary = results.data.summary.trim();
    results.data.fullText = results.data.fullText.trim();

    console.log(`✅ Extracted data from ${req.files.length} files for user ${userId}`);
    res.json(results);

  } catch (error) {
    console.error('🔍 Document extraction error:', error);
    res.status(500).json({
      success: false,
      data: {},
      error: 'Failed to extract document data',
      details: error.message
    });
  }
});

// Upload document
app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, isAdmin = 'false', folderId, primaryFolderId, category, tags } = req.body;
    
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
              category: category || primaryFolder?.slug || 'general',
              chunkIndex: chunk.metadata.chunkIndex,
              wordCount: chunk.metadata.wordCount,
              headings: [], // Could be enhanced with heading extraction
              folderId: folderId || null,
              folderName: folderId ? folders.get(folderId)?.name : null,
              primaryFolderId: primaryFolderId || null,
              primaryFolderName: primaryFolder?.name || null,
              primaryFolderSlug: primaryFolder?.slug || null,
              tags: tags ? JSON.parse(tags) : []
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

// Helper function to build conversation state from message history
function buildConversationState(messages) {
  const state = {
    passportInfo: null,
    travelDestination: null,
    travelDates: null,
    visaInquiry: null,
    previousQuestions: []
  };
  
  // Analyze messages to extract state
  messages.forEach(msg => {
    const content = msg.content.toLowerCase();
    
    // Check for passport expiry mentions
    const passportExpiryMatch = content.match(/passport.*expir.*?(\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (passportExpiryMatch) {
      state.passportInfo = { expiry: passportExpiryMatch[1] };
    }
    
    // Check for destination mentions (common travel destinations)
    const destinations = ['greece', 'spain', 'italy', 'france', 'germany', 'japan', 'thailand', 'australia'];
    destinations.forEach(dest => {
      if (content.includes(dest)) {
        state.travelDestination = dest.charAt(0).toUpperCase() + dest.slice(1);
      }
    });
    
    // Check for visa mentions
    if (content.includes('visa')) {
      state.visaInquiry = true;
    }
    
    // Track questions asked
    if (msg.sender === 'user' && content.includes('?')) {
      state.previousQuestions.push(content.substring(0, 100));
    }
  });
  
  return state;
}

// Tala AI Chat endpoint
app.post('/api/chat', authenticate, asyncHandler(async (req, res) => {
  const { message, conversationId, maxResults = 5 } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`💬 Chat request from user ${req.userId}: "${message.substring(0, 100)}..."`); 
    
    const collectionName = getCollectionName(req.userId, req.user.role === 'admin');
    
    // Step 1: Search relevant documents using Tala AI
    console.log('🔍 Searching knowledge base for relevant context...');
    const queryEmbedding = await generateEmbedding(message);
    
    let searchResults = [];
    
    if (queryEmbedding) {
      try {
        searchResults = await qdrant.search(collectionName, {
          vector: queryEmbedding,
          limit: maxResults,
          score_threshold: 0.3
        });
        console.log(`📊 Found ${searchResults.length} relevant documents`);
      } catch (error) {
        console.warn('⚠️  Vector search failed, continuing without context:', error.message);
      }
    } else {
      console.warn('⚠️  No embeddings available, continuing without document context');
    }
    
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
    
    // Step 3: Get conversation history and enhanced context
    let conversationHistory = '';
    let conversationContext = '';
    let extractedEntities = [];
    let conversationState = {};
    
    if (conversationId) {
      let conversation = null;
      
      try {
        // Try to get conversation from database first
        const conversationResult = await conversationService.getConversationById(conversationId, {
          organizationId: req.organizationId
        });
        conversation = conversationResult.success ? conversationResult.data : null;
      } catch (error) {
        // Fallback to file-based conversation
        conversation = conversations.get(conversationId);
      }
      
      const persistContext = conversation?.persist_context !== false && conversation?.persistContext !== false; // Default to true
      
      if (persistContext && conversation && !conversation.context_reset && !conversation.contextReset) {
        // Get previous messages for context from file-based storage
        const existingMessages = conversationMessages.get(conversationId) || [];
        if (existingMessages.length > 0) {
          conversationHistory = existingMessages
            .map(msg => `${msg.sender === 'user' ? 'User' : 'Tala'}: ${msg.content}`)
            .join('\n');
          
          // Extract entities from previous messages to build conversation state
          const previousEntities = [];
          existingMessages.forEach(msg => {
            if (msg.entities) {
              previousEntities.push(...msg.entities);
            }
          });
          
          // Build conversation state from previous messages
          conversationState = buildConversationState(existingMessages);
        }
      } else if (conversation?.contextReset) {
        // If context was reset, clear the reset flag for future messages
        conversation.contextReset = false;
        conversations.set(conversationId, conversation);
      }
      
      // Try to extract context from current message with enhanced history
      try {
        const contextResponse = await fetch('http://localhost:3001/api/chat/extract-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            contextSummary: conversationHistory ? `Recent conversation:\n${conversationHistory}` : '',
            existingEntities: extractedEntities,
            conversationState
          })
        });
        
        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          extractedEntities = contextData.entities || [];
          
          if (contextData.entities?.length > 0 || contextData.contextUpdates) {
            const entities = contextData.entities.map(e => `${e.type}: ${e.value}`).join(', ');
            const updates = Object.entries(contextData.contextUpdates || {})
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ');
            
            conversationContext = `\n\nConversation Context:\n`;
            if (entities) conversationContext += `Entities discussed: ${entities}\n`;
            if (updates) conversationContext += `Current context: ${updates}\n`;
            
            // Add specific context based on conversation state
            if (conversationState.passportInfo) {
              conversationContext += `User's passport expires: ${conversationState.passportInfo.expiry}\n`;
            }
            if (conversationState.travelDestination) {
              conversationContext += `Planning travel to: ${conversationState.travelDestination}\n`;
            }
            if (conversationState.travelDates) {
              conversationContext += `Travel dates: ${conversationState.travelDates}\n`;
            }
            
            conversationContext += `\nIMPORTANT: Use this context to understand references like "there", "it", "the place", "my passport", etc. When the user asks follow-up questions, refer back to the conversation history.`;
          }
        }
      } catch (contextError) {
        console.warn('Context extraction failed, continuing without context:', contextError.message);
      }
    }

    // Step 4: Generate AI response using Tala AI with conversation awareness
    const systemPrompt = `You are Tala, an AI travel assistant with access to a comprehensive knowledge base of travel documents, visa requirements, airline policies, and destination information.

Your role:
- Provide helpful, accurate travel advice based on the provided context
- CRITICAL: Use conversation history to understand references and maintain continuity across multiple turns
- When users ask follow-up questions, refer back to previous information discussed
- Understand references like "there", "it", "the place", "my passport" based on conversation context
- If the user mentions something discussed earlier (like passport expiry), acknowledge and use that information
- If the context doesn't contain relevant information, acknowledge this and provide general guidance
- Always be friendly, professional, and travel-focused
- Cite specific documents when possible
- Use markdown formatting for better readability

IMPORTANT CONTEXT AWARENESS RULES:
1. When the user says "there" or "that place", refer to the most recently discussed location
2. When the user asks about "it", refer to the most recent travel document, visa, or item discussed
3. When the user mentions "my passport", use any previously mentioned passport expiry information
4. For follow-up questions, always consider what was discussed in previous messages
5. If passport expiry was mentioned earlier and the user asks about visa requirements, proactively consider if their passport validity meets the requirements

${conversationHistory ? `Recent Conversation History:\n${conversationHistory}\n` : ''}${conversationContext}

Context from knowledge base:
${context || 'No relevant documents found in the knowledge base.'}`;
    
    // Step 4: Generate AI response using ChatService (supports both OpenAI-only and multi-LLM)
    const chatResponse = await chatService.generateResponse({
      message,
      systemPrompt,
      conversationContext: {
        documentContext: context,
        entities: extractedEntities,
        messageCount: conversationHistory ? conversationHistory.split('\n').length : 0,
        lastActivity: Date.now(),
        conversationState
      },
      userPreferences: {
        costOptimization: req.body.costOptimization || false,
        fastResponse: req.body.fastResponse || false,
        preferredModel: req.body.preferredModel || null
      },
      maxTokens: req.body.maxTokens || 1000,
      temperature: req.body.temperature || 0.7,
      userId: req.userId,
      conversationId
    });
    
    const aiResponse = chatResponse.content;
    
    // Handle generation errors
    if (!aiResponse) {
      return res.status(500).json({
        error: 'Failed to generate response',
        details: chatResponse.error,
        routing: chatResponse.routing
      });
    }
    
    // Step 4: Prepare sources for the response
    const sources = contextChunks.map(chunk => ({
      title: chunk.title,
      type: 'document',
      score: chunk.score,
      documentId: chunk.documentId
    }));
    
    console.log(`✅ Generated AI response (${aiResponse?.length} chars) with ${sources.length} sources`);
    
    // Step 5: Handle conversation storage
    let finalConversationId = conversationId;
    let conversation = null;
    
    if (finalConversationId) {
      // Get existing conversation
      try {
        const conversationResult = await conversationService.getConversationById(finalConversationId, {
          organizationId: req.organizationId
        });
        conversation = conversationResult.success ? conversationResult.data : null;
      } catch (error) {
        // Fallback to file-based conversation
        conversation = conversations.get(finalConversationId);
      }
    }
    
    if (!conversation) {
      // Create new conversation
      const conversationData = {
        organization_id: req.organizationId,
        user_id: req.userId,
        title: message.length > 50 ? message.substring(0, 50) + '...' : message,
        persist_context: true,
        context_reset: false
      };
      
      try {
        const createResult = await conversationService.createConversation(conversationData);
        if (createResult.success) {
          conversation = createResult.data;
          finalConversationId = conversation.id;
          console.log(`💬 Created new conversation: ${finalConversationId}`);
        } else {
          // Database unavailable, use file-based storage fallback
          finalConversationId = uuidv4();
          conversation = {
            id: finalConversationId,
            userId: req.userId,
            title: conversationData.title,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            persistContext: true,
            contextReset: false
          };
          conversations.set(finalConversationId, conversation);
          saveConversations();
          console.log(`💬 Created new file-based conversation: ${finalConversationId}`);
        }
      } catch (error) {
        // Database unavailable, use file-based storage fallback
        finalConversationId = uuidv4();
        conversation = {
          id: finalConversationId,
          userId: req.userId,
          title: conversationData.title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          persistContext: true,
          contextReset: false
        };
        conversations.set(finalConversationId, conversation);
        saveConversations();
        console.log(`💬 Created new file-based conversation: ${finalConversationId}`);
      }
    } else {
      // Update existing conversation activity (optional if database available)
      try {
        await conversationService.updateConversation(finalConversationId, {
          last_message_preview: aiResponse.length > 100 ? aiResponse.substring(0, 100) + '...' : aiResponse
        }, { organizationId: req.organizationId });
        console.log(`💬 Updated conversation: ${finalConversationId}`);
      } catch (error) {
        console.warn('⚠️  Could not update conversation in database, using file-based storage:', error.message);
        // Update file-based conversation
        const fileConversation = conversations.get(finalConversationId);
        if (fileConversation) {
          fileConversation.updatedAt = new Date().toISOString();
          fileConversation.lastMessagePreview = aiResponse.length > 100 ? aiResponse.substring(0, 100) + '...' : aiResponse;
          conversations.set(finalConversationId, fileConversation);
          saveConversations();
          console.log(`💬 Updated file-based conversation: ${finalConversationId}`);
        }
      }
    }
    
    // Store messages in file-based system as fallback
    const messages = conversationMessages.get(finalConversationId) || [];
    
    // Add user message
    messages.push({
      id: uuidv4(),
      conversationId: finalConversationId,
      sender: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      entities: extractedEntities
    });
    
    // Add AI response
    messages.push({
      id: uuidv4(),
      conversationId: finalConversationId,
      sender: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
      sources: sources,
      tokensUsed: chatResponse.tokensUsed || 0,
      cost: chatResponse.cost || 0,
      model: chatResponse.model || 'unknown',
      provider: chatResponse.provider || 'unknown'
    });
    
    conversationMessages.set(finalConversationId, messages);
    saveConversations();
    
    console.log(`💾 Saved conversation ${finalConversationId} with ${messages.length} messages`);
    
    // Step 6: Return response with metadata
    res.json({
      response: aiResponse,
      sources: sources,
      contextUsed: contextChunks.length > 0,
      conversationId: finalConversationId,
      timestamp: new Date().toISOString(),
      tokensUsed: chatResponse.usage?.totalTokens || 0,
      cost: chatResponse.usage?.cost || 0,
      model: chatResponse.model,
      provider: chatResponse.provider,
      routing: chatResponse.routing,
      performance: chatResponse.performance,
      metadata: chatResponse.metadata
    });
}));

// Entity extraction endpoint for conversation context
app.post('/api/chat/extract-context', async (req, res) => {
  try {
    const { message, contextSummary, existingEntities } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('🧠 Extracting context from message:', message.substring(0, 100));
    
    // Define extraction functions for OpenAI
    const functions = [
      {
        name: 'extract_entities_and_intents',
        description: 'Extract travel-related entities and intents from user message',
        parameters: {
          type: 'object',
          properties: {
            entities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['country', 'city', 'date', 'passport_expiry', 'travel_date', 'person_name', 'airline', 'hotel', 'visa_type', 'duration', 'currency', 'document_type', 'restaurant', 'activity', 'transportation', 'custom']
                  },
                  value: { type: 'string' },
                  confidence: { type: 'number', minimum: 0, maximum: 1 }
                },
                required: ['type', 'value', 'confidence']
              }
            },
            intents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['visa_inquiry', 'passport_check', 'travel_planning', 'restaurant_search', 'hotel_search', 'flight_inquiry', 'document_request', 'general_info', 'itinerary_planning', 'booking_assistance', 'travel_requirements', 'emergency_info', 'cost_inquiry', 'weather_inquiry', 'cultural_info', 'language_help', 'currency_exchange', 'transportation_info', 'activity_search']
                  },
                  confidence: { type: 'number', minimum: 0, maximum: 1 }
                },
                required: ['type', 'confidence']
              }
            },
            references: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['pronoun', 'demonstrative', 'implicit', 'ellipsis']
                  },
                  referenceText: { type: 'string' },
                  resolvedEntityId: { type: 'string' },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  clarificationNeeded: { type: 'boolean' }
                },
                required: ['type', 'referenceText', 'confidence']
              }
            },
            contextUpdates: {
              type: 'object',
              properties: {
                currentCountry: { type: 'string' },
                currentCity: { type: 'string' },
                clientInfo: {
                  type: 'object',
                  properties: {
                    passportExpiry: { type: 'string' },
                    nationality: { type: 'string' }
                  }
                }
              }
            },
            overallConfidence: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['entities', 'intents', 'references', 'overallConfidence']
        }
      }
    ];

    const systemPrompt = `You are an expert at extracting travel-related entities and intents from conversational messages.

Context Summary: ${contextSummary || 'No previous context'}
Existing Entities: ${JSON.stringify(existingEntities || [])}
${req.body.conversationState ? `Conversation State: ${JSON.stringify(req.body.conversationState)}` : ''}

Extract entities, intents, and resolve references like "there", "it", "the place", "my passport" using the context.

CRITICAL REFERENCE RESOLUTION RULES:
1. "there" or "that place" → refers to the most recently mentioned location (country or city)
2. "it" → refers to the most recent document, visa, or travel item
3. "my passport" → if passport expiry was mentioned before, include that information
4. "the visa" → refers to the visa type most recently discussed
5. When someone asks "What about if my passport expires in [date]?" → extract passport_expiry entity
6. For follow-up questions without explicit entity mentions, infer from conversation context

Examples:
- If user previously asked about Greece visa and then asks "What documents do I need for it?" → "it" = Greece visa
- If user mentioned passport expiry and asks about visa requirements → include passport validity in context updates

Be precise and extract all relevant entities, including implicit ones from the conversation context.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract entities and intents from: "${message}"` }
      ],
      functions,
      function_call: { name: 'extract_entities_and_intents' },
      temperature: 0.1
    });

    const functionCall = completion.choices[0].message.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('No function call result');
    }

    const extractedData = JSON.parse(functionCall.arguments);
    
    // Process and format the extracted data
    const processedEntities = extractedData.entities.map(entity => ({
      id: `${entity.type}_${entity.value.replace(/\\s+/g, '_').toLowerCase()}_${Date.now()}`,
      type: entity.type,
      value: entity.value,
      normalizedValue: entity.value.toLowerCase().trim(),
      confidence: entity.confidence,
      firstMentioned: new Date(),
      lastReferenced: new Date(),
      referenceCount: 1,
      context: message.substring(0, 200)
    }));

    const processedIntents = extractedData.intents.map(intent => ({
      id: `${intent.type}_${Date.now()}`,
      type: intent.type,
      confidence: intent.confidence,
      detectedAt: new Date(),
      relatedEntities: [],
      isActive: true
    }));

    const result = {
      entities: processedEntities,
      intents: processedIntents,
      references: extractedData.references || [],
      confidence: extractedData.overallConfidence || 0.5,
      contextUpdates: extractedData.contextUpdates || {}
    };

    console.log(`✅ Extracted ${result.entities.length} entities and ${result.intents.length} intents`);
    
    res.json(result);
    
  } catch (error) {
    console.error('🧠 Context extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract context',
      details: error.message
    });
  }
});

// Get chat history
app.get('/api/chat/history/:conversationId', authenticate, asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  
  let conversation = null;
  let messages = [];
  
  try {
    // Try to get conversation from database first
    const conversationResult = await conversationService.getConversationById(conversationId, {
      organizationId: req.organizationId
    });
    
    if (conversationResult.success) {
      conversation = conversationResult.data;
      
      // Verify user has access to this conversation
      if (conversation.user_id !== req.userId) {
        return res.status(403).json({ error: 'Access denied to this conversation' });
      }
      
      // TODO: Get messages from database when MessageService is implemented
      messages = [];
      console.log(`📜 Retrieved ${messages.length} messages from database for conversation ${conversationId}`);
    } else {
      throw new Error('Conversation not found in database');
    }
  } catch (error) {
    // Fallback to file-based conversation
    conversation = conversations.get(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Verify user has access to this conversation
    if (conversation.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }
    
    // Get messages from file-based storage
    messages = conversationMessages.get(conversationId) || [];
    console.log(`📜 Retrieved ${messages.length} file-based messages for conversation ${conversationId}`);
  }
  
  res.json({
    conversationId,
    conversation,
    messages,
    lastActivity: conversation.updated_at
  });
}));

// List user conversations
app.get('/api/chat/conversations', authenticate, asyncHandler(async (req, res) => {
  let userConversations = [];
  
  try {
    // Try to get conversations from database first
    const conversationsResult = await conversationService.getConversationsByUser(req.userId, {
      organizationId: req.organizationId,
      orderBy: 'updated_at',
      orderDirection: 'desc',
      pagination: { page: 1, pageSize: 15 }
    });
    
    if (conversationsResult.success) {
      userConversations = conversationsResult.data;
      console.log(`📋 Retrieved ${userConversations.length} conversations from database for user ${req.userId}`);
    } else {
      throw new Error('Database query failed');
    }
  } catch (error) {
    // Fallback to file-based conversations
    console.warn('⚠️  Database unavailable, using file-based conversations');
    userConversations = Array.from(conversations.values())
      .filter(conv => conv.userId === req.userId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 15)
      .map(conv => ({
        id: conv.id,
        title: conv.title,
        created_at: conv.createdAt,
        updated_at: conv.updatedAt,
        last_message_preview: conv.lastMessagePreview || '',
        message_count: (conversationMessages.get(conv.id) || []).length,
        lastActivity: conv.updatedAt
      }));
    
    console.log(`📋 Retrieved ${userConversations.length} file-based conversations for user ${req.userId}`);
  }
  
  res.json({
    conversations: userConversations
  });
}));

// Delete a conversation
app.delete('/api/chat/conversations/:conversationId', authenticate, asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  
  // Get conversation to verify ownership
  const conversationResult = await conversationService.getConversationById(conversationId, {
    organizationId: req.organizationId
  });
  
  if (!conversationResult.success) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const conversation = conversationResult.data;
  
  // Verify user owns this conversation
  if (conversation.user_id !== req.userId) {
    return res.status(403).json({ error: 'Access denied to this conversation' });
  }
  
  // Delete conversation (this will cascade delete messages due to foreign key constraints)
  const deleteResult = await conversationService.deleteConversation(conversationId, {
    organizationId: req.organizationId
  });
  
  if (!deleteResult.success) {
    return res.status(500).json({ error: 'Failed to delete conversation' });
  }
  
  console.log(`🗑️ Deleted conversation ${conversationId}`);
  
  res.json({ success: true });
}));

// Reset conversation context
app.post('/api/chat/context/reset', async (req, res) => {
  try {
    const { conversationId, userId } = req.body;
    
    if (!conversationId || !userId) {
      return res.status(400).json({ error: 'conversationId and userId are required' });
    }
    
    // Verify conversation belongs to user
    const conversation = conversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Reset conversation context by clearing stored entities
    const messages = conversationMessages.get(conversationId) || [];
    messages.forEach(msg => {
      if (msg.entities) {
        delete msg.entities;
      }
    });
    
    // Update conversation metadata
    conversation.contextReset = true;
    conversation.lastContextReset = new Date().toISOString();
    conversations.set(conversationId, conversation);
    
    // Save changes
    saveConversations();
    
    console.log(`🔄 Reset context for conversation ${conversationId}`);
    
    res.json({ 
      success: true,
      message: 'Conversation context has been reset'
    });
    
  } catch (error) {
    console.error('🔄 Context reset error:', error);
    res.status(500).json({
      error: 'Failed to reset conversation context',
      details: error.message
    });
  }
});

// Toggle context persistence for a conversation
app.post('/api/chat/context/toggle', async (req, res) => {
  try {
    const { conversationId, userId, persistContext } = req.body;
    
    if (!conversationId || !userId || persistContext === undefined) {
      return res.status(400).json({ error: 'conversationId, userId, and persistContext are required' });
    }
    
    // Verify conversation belongs to user
    const conversation = conversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Update context persistence setting
    conversation.persistContext = persistContext;
    conversation.contextSettingsUpdated = new Date().toISOString();
    conversations.set(conversationId, conversation);
    
    // Save changes
    saveConversations();
    
    console.log(`🔧 Set context persistence to ${persistContext} for conversation ${conversationId}`);
    
    res.json({ 
      success: true,
      persistContext,
      message: `Context persistence ${persistContext ? 'enabled' : 'disabled'}`
    });
    
  } catch (error) {
    console.error('🔧 Context toggle error:', error);
    res.status(500).json({
      error: 'Failed to toggle context persistence',
      details: error.message
    });
  }
});

// Get conversation context status
app.get('/api/chat/context/status/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Get conversation
    const conversation = conversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get messages to analyze context
    const messages = conversationMessages.get(conversationId) || [];
    const entitiesCount = messages.reduce((count, msg) => {
      return count + (msg.entities?.length || 0);
    }, 0);
    
    res.json({
      conversationId,
      persistContext: conversation.persistContext !== false, // Default to true
      contextReset: conversation.contextReset || false,
      lastContextReset: conversation.lastContextReset || null,
      entitiesTracked: entitiesCount,
      messageCount: messages.length
    });
    
  } catch (error) {
    console.error('📊 Context status error:', error);
    res.status(500).json({
      error: 'Failed to get context status',
      details: error.message
    });
  }
});

// Get document content by ID
app.get('/api/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId } = req.query;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    
    console.log(`📄 Fetching document content for ID: ${documentId}`);
    
    // Determine which collections to search
    const collections = ['tala_admin_knowledge'];
    if (userId) {
      const userCollection = getCollectionName(userId, false);
      collections.push(userCollection);
    }
    
    let documentContent = null;
    let documentMetadata = null;
    
    // Search in all available collections
    for (const collectionName of collections) {
      try {
        // Check if collection exists
        const collectionInfo = await qdrant.getCollection(collectionName);
        if (!collectionInfo) continue;
        
        // Search for document chunks with this documentId
        const scrollResult = await qdrant.scroll(collectionName, {
          filter: {
            must: [
              {
                key: 'documentId',
                match: { value: documentId }
              }
            ]
          },
          limit: 1000, // Get all chunks for this document
          with_payload: true,
          with_vector: false
        });
        
        if (scrollResult.points && scrollResult.points.length > 0) {
          // Sort chunks by index and combine content
          const chunks = scrollResult.points
            .map(point => ({
              content: point.payload.content,
              chunkIndex: point.payload.metadata?.chunkIndex || 0,
              metadata: point.payload.metadata,
              document: point.payload.document
            }))
            .sort((a, b) => a.chunkIndex - b.chunkIndex);
          
          // Combine all chunks into full document content
          documentContent = chunks.map(chunk => chunk.content).join('\n\n');
          
          // Get metadata from first chunk
          const firstChunk = chunks[0];
          documentMetadata = {
            title: firstChunk.metadata?.title || firstChunk.document?.originalName || 'Unknown Document',
            fileType: firstChunk.document?.fileType || 'unknown',
            fileSize: firstChunk.document?.fileSize || 0,
            uploadedAt: firstChunk.document?.uploadedAt,
            pages: firstChunk.metadata?.pages,
            author: firstChunk.metadata?.author,
            category: firstChunk.metadata?.category,
            tags: firstChunk.metadata?.tags || []
          };
          
          // Format file size
          if (typeof documentMetadata.fileSize === 'number') {
            if (documentMetadata.fileSize > 1024 * 1024) {
              documentMetadata.fileSize = `${(documentMetadata.fileSize / (1024 * 1024)).toFixed(2)} MB`;
            } else if (documentMetadata.fileSize > 1024) {
              documentMetadata.fileSize = `${(documentMetadata.fileSize / 1024).toFixed(2)} KB`;
            } else {
              documentMetadata.fileSize = `${documentMetadata.fileSize} bytes`;
            }
          }
          
          break; // Found the document, stop searching
        }
      } catch (collectionError) {
        console.warn(`Could not search collection ${collectionName}:`, collectionError.message);
        continue;
      }
    }
    
    if (!documentContent) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    console.log(`✅ Found document: ${documentMetadata.title} (${documentContent.length} chars)`);
    
    res.json({
      title: documentMetadata.title,
      content: documentContent,
      metadata: documentMetadata
    });
    
  } catch (error) {
    console.error('📄 Document fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch document',
      details: error.message
    });
  }
});

// Store voice input in knowledge base
app.post('/api/voice/store', async (req, res) => {
  try {
    const { content, userId, title, primaryFolderId, category } = req.body;
    
    if (!content || !userId) {
      return res.status(400).json({ error: 'Content and userId are required' });
    }
    
    console.log(`🎤 Storing voice input from user ${userId} in category "${category || 'auto-detect'}": "${content.substring(0, 100)}..."`);
    
    // Create a text file from the voice input
    const filename = title || `voice-input-${Date.now()}.txt`;
    const buffer = Buffer.from(content, 'utf-8');
    
    // Create a mock file object for processing
    const mockFile = {
      originalname: filename,
      buffer: buffer,
      mimetype: 'text/plain',
      size: buffer.length
    };
    
    // Generate document ID
    const documentId = uuidv4();
    
    // Process the content for vector storage
    const textChunks = content.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 0);
    const points = [];
    
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i].trim();
      if (chunk.length > 0) {
        const embedding = await generateEmbedding(chunk);
        
        points.push({
          id: uuidv4(),
          vector: embedding,
          payload: {
            content: chunk,
            chunkIndex: i,
            documentId: documentId,
            metadata: {
              title: filename,
              type: 'voice-input',
              uploadedAt: new Date().toISOString(),
              userId: userId,
              isAdmin: false,
              primaryFolderId: primaryFolderId,
              category: category
            }
          }
        });
      }
    }
    
    // Store in user's collection
    const collectionName = getCollectionName(userId, false);
    await ensureCollectionExists(collectionName);
    
    if (points.length > 0) {
      await qdrant.upsert(collectionName, {
        wait: true,
        points: points
      });
    }
    
    console.log(`✅ Stored voice input with ${points.length} chunks for user ${userId}`);
    
    res.json({
      success: true,
      documentId,
      chunksStored: points.length,
      filename,
      message: 'Voice input stored successfully in knowledge base'
    });
    
  } catch (error) {
    console.error('🎤 Voice storage error:', error);
    res.status(500).json({
      error: 'Failed to store voice input',
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

// 404 handler for unknown routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    if (chatService) {
      await chatService.shutdown();
      console.log('✅ Chat Service shutdown completed');
    }
    
    if (llmRouter) {
      await llmRouter.shutdown();
      console.log('✅ LLM Router shutdown completed');
    }
    
    // Cleanup Redis connection
    const { cleanupRedis } = await import('./config/redis.js');
    await cleanupRedis();
    console.log('✅ Redis cleanup completed');
    
    console.log('🏁 Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Tala AI Backend Server running on port ${PORT}`);
  console.log(`📡 CORS enabled for: ${process.env.CORS_ORIGIN}`);
  console.log(`🔗 Qdrant URL: ${process.env.QDRANT_URL}`);
  console.log(`🤖 Multi-LLM Mode: ${enableMultiLLM ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🔐 Authentication: ${process.env.NODE_ENV === 'development' || process.env.MOCK_AUTH === 'true' || !process.env.NODE_ENV ? 'Mock mode (development)' : 'Production mode'}`);
  console.log(`🚦 Rate Limiting: ENABLED`);
  console.log(`⚡ Redis Caching: ${process.env.REDIS_URL ? 'ENABLED' : 'FALLBACK MODE'}`);
  console.log(`🗄️  Database: ${process.env.SUPABASE_URL ? 'PostgreSQL (Supabase)' : 'JSON Files'}`);
  
  if (enableMultiLLM) {
    console.log(`💰 Daily Budget: $${parseFloat(process.env.DAILY_LLM_BUDGET) || 50.00}`);
    console.log(`📊 Monitoring: ENABLED`);
    console.log(`🔗 Metrics: http://localhost:${PORT}/api/llm/metrics`);
  }
  
  // Start WebSocket server for email-to-task updates
  if (process.env.EMAIL_WS_PORT) {
    console.log(`📡 WebSocket server for email updates on port ${process.env.EMAIL_WS_PORT}`);
  }
});