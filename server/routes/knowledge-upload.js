import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const channel = req.body.channel || 'direct_mail';
    const category = req.body.category || 'fundamentals';
    const uploadPath = path.join(
      process.cwd(), 
      'server/knowledge', 
      channel, 
      category
    );
    
    // Ensure directory exists
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const sanitized = file.originalname
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-\.]/g, '');
    cb(null, sanitized);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.md', '.txt', '.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .md, .txt, .pdf, and .docx are allowed.'));
    }
  }
});

// Upload endpoint
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { channel, category, metadata } = req.body;
    const uploadedFiles = [];
    
    for (const file of req.files) {
      // Process file based on type
      let processedContent = '';
      const ext = path.extname(file.filename).toLowerCase();
      
      if (ext === '.md' || ext === '.txt') {
        // Read text content directly
        processedContent = await fs.readFile(file.path, 'utf-8');
      } else if (ext === '.pdf' || ext === '.docx') {
        // TODO: Add PDF/DOCX conversion
        processedContent = `[Conversion needed for ${file.filename}]`;
      }
      
      // Add metadata if not present
      if (ext === '.md' && !processedContent.startsWith('---')) {
        const enhancedContent = `---
title: ${path.basename(file.filename, ext)}
channel: ${channel}
category: ${category}
uploaded_date: ${new Date().toISOString()}
original_filename: ${file.originalname}
${metadata ? `metadata: ${JSON.stringify(metadata)}` : ''}
---

${processedContent}`;
        
        await fs.writeFile(file.path, enhancedContent);
      }
      
      uploadedFiles.push({
        filename: file.filename,
        path: file.path,
        size: file.size,
        channel,
        category
      });
    }
    
    res.json({
      success: true,
      message: `Uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List uploaded files
router.get('/list/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    const knowledgePath = path.join(process.cwd(), 'server/knowledge', channel);
    
    const files = await listFilesRecursively(knowledgePath);
    
    res.json({
      success: true,
      channel,
      files
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to list files recursively
async function listFilesRecursively(dir, baseDir = dir) {
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await listFilesRecursively(fullPath, baseDir));
      } else if (entry.isFile() && ['.md', '.txt'].includes(path.extname(entry.name))) {
        const stats = await fs.stat(fullPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const { data } = matter(content);
        
        files.push({
          name: entry.name,
          path: path.relative(baseDir, fullPath),
          category: path.dirname(path.relative(baseDir, fullPath)),
          size: stats.size,
          modified: stats.mtime,
          metadata: data
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

export default router;