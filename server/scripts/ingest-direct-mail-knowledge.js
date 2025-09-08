#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import matter from 'gray-matter';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize clients
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration
const COLLECTION_NAME = 'kb_direct_mail';
const VECTOR_SIZE = 1536;
const BATCH_SIZE = 100;
const CHUNK_SIZE = 1000; // words
const CHUNK_OVERLAP = 200; // words

// Direct Mail specific metadata extractor
function extractDirectMailMetadata(content, filename) {
  const metadata = {
    channel: 'direct_mail',
    filename: filename,
    ingested_at: new Date().toISOString()
  };

  // Extract category based on filename
  if (filename.toLowerCase().includes('postcard')) {
    metadata.category = 'postcards';
    metadata.format_type = 'postcard';
  } else if (filename.toLowerCase().includes('letter')) {
    metadata.category = 'letters';
    metadata.format_type = 'letter';
  } else if (filename.toLowerCase().includes('offer')) {
    metadata.category = 'offers';
    metadata.topic = 'offer_strategy';
  } else if (filename.toLowerCase().includes('list') || filename.toLowerCase().includes('mailing')) {
    metadata.category = 'targeting';
    metadata.topic = 'list_management';
  } else if (filename.toLowerCase().includes('comprehensive')) {
    metadata.category = 'comprehensive';
    metadata.expertise_level = 'advanced';
  }

  // Extract expertise level based on content
  if (content.includes('Executive Summary') || content.includes('Strategic Framework')) {
    metadata.expertise_level = 'advanced';
  } else if (content.includes('Best Practices') || content.includes('Getting Started')) {
    metadata.expertise_level = 'intermediate';
  } else {
    metadata.expertise_level = 'beginner';
  }

  // Extract key topics mentioned
  const topics = [];
  if (content.includes('ROI') || content.includes('response rate')) topics.push('metrics');
  if (content.includes('personalization') || content.includes('segmentation')) topics.push('targeting');
  if (content.includes('QR code') || content.includes('PURL')) topics.push('digital_integration');
  if (content.includes('A/B test')) topics.push('testing');
  if (content.includes('compliance') || content.includes('USPS')) topics.push('compliance');
  
  if (topics.length > 0) metadata.topics = topics;

  return metadata;
}

// Smart chunking for direct mail content
function chunkDirectMailContent(content, metadata) {
  const chunks = [];
  
  // Split by major sections first
  const sections = content.split(/^#{1,3}\s+/m).filter(Boolean);
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionTitle = section.split('\n')[0].trim();
    const sectionContent = section.slice(sectionTitle.length).trim();
    
    // Handle special sections that should stay together
    if (sectionTitle.includes('Template') || 
        sectionTitle.includes('Example') || 
        sectionTitle.includes('Script')) {
      // Keep templates and examples intact
      chunks.push({
        text: `## ${sectionTitle}\n\n${sectionContent}`,
        metadata: {
          ...metadata,
          section: sectionTitle,
          chunk_type: 'template'
        }
      });
    } else {
      // Regular paragraph-based chunking for other content
      const paragraphs = sectionContent.split(/\n\n+/);
      let currentChunk = `## ${sectionTitle}\n\n`;
      let wordCount = sectionTitle.split(/\s+/).length;
      
      for (const paragraph of paragraphs) {
        const paragraphWords = paragraph.split(/\s+/).length;
        
        if (wordCount + paragraphWords > CHUNK_SIZE && currentChunk.length > 100) {
          chunks.push({
            text: currentChunk.trim(),
            metadata: {
              ...metadata,
              section: sectionTitle,
              chunk_type: 'content'
            }
          });
          // Start new chunk with overlap
          const overlapText = currentChunk.split(/\s+/).slice(-CHUNK_OVERLAP).join(' ');
          currentChunk = `## ${sectionTitle} (continued)\n\n${overlapText}\n\n${paragraph}`;
          wordCount = CHUNK_OVERLAP + paragraphWords;
        } else {
          currentChunk += `\n\n${paragraph}`;
          wordCount += paragraphWords;
        }
      }
      
      if (currentChunk.trim().length > 100) {
        chunks.push({
          text: currentChunk.trim(),
          metadata: {
            ...metadata,
            section: sectionTitle,
            chunk_type: 'content'
          }
        });
      }
    }
  }
  
  return chunks;
}

// Generate embeddings
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Ensure collection exists
async function ensureCollection() {
  try {
    await qdrant.getCollection(COLLECTION_NAME);
    console.log(`✅ Collection ${COLLECTION_NAME} already exists`);
  } catch (error) {
    console.log(`📦 Creating collection ${COLLECTION_NAME}...`);
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine'
      },
      optimizers_config: {
        default_segment_number: 2
      },
      replication_factor: 2
    });
    console.log(`✅ Collection ${COLLECTION_NAME} created`);
  }
}

// Main ingestion function
async function ingestDirectMailKnowledge() {
  console.log('🚀 Starting Direct Mail Knowledge Ingestion\n');
  
  // Path to Direct Mail files
  const directMailPath = '/Users/will/tala ai/Agents/Direct Mail';
  
  try {
    // Ensure collection exists
    await ensureCollection();
    
    // Read all files
    const files = await fs.readdir(directMailPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    console.log(`📁 Found ${mdFiles.length} markdown files to process:\n`);
    mdFiles.forEach(f => console.log(`   - ${f}`));
    console.log('');
    
    let totalChunks = 0;
    const allPoints = [];
    
    // Process each file
    for (const filename of mdFiles) {
      console.log(`\n📄 Processing: ${filename}`);
      
      const filePath = path.join(directMailPath, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract metadata
      const metadata = extractDirectMailMetadata(content, filename);
      console.log(`   Metadata:`, metadata);
      
      // Chunk the content
      const chunks = chunkDirectMailContent(content, metadata);
      console.log(`   Created ${chunks.length} chunks`);
      
      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = uuidv4();
        
        console.log(`   Embedding chunk ${i + 1}/${chunks.length}...`);
        const embedding = await generateEmbedding(chunk.text);
        
        allPoints.push({
          id: chunkId,
          vector: embedding,
          payload: {
            text: chunk.text,
            ...chunk.metadata,
            source_file: filename,
            chunk_id: `${filename}::${i}`,
            chunk_index: i,
            total_chunks: chunks.length,
            char_count: chunk.text.length,
            word_count: chunk.text.split(/\s+/).length
          }
        });
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      totalChunks += chunks.length;
    }
    
    // Batch upload to Qdrant
    console.log(`\n📤 Uploading ${allPoints.length} chunks to Qdrant...`);
    
    for (let i = 0; i < allPoints.length; i += BATCH_SIZE) {
      const batch = allPoints.slice(i, i + BATCH_SIZE);
      await qdrant.upsert(COLLECTION_NAME, {
        wait: true,
        points: batch
      });
      console.log(`   Uploaded ${Math.min(i + BATCH_SIZE, allPoints.length)}/${allPoints.length} chunks`);
    }
    
    // Verify upload
    const collectionInfo = await qdrant.getCollection(COLLECTION_NAME);
    console.log(`\n✅ Ingestion complete!`);
    console.log(`   Total points in collection: ${collectionInfo.points_count}`);
    console.log(`   Total vectors: ${collectionInfo.vectors_count}`);
    
    // Test search
    console.log(`\n🔍 Testing search functionality...`);
    const testQuery = "How to create effective direct mail headlines for postcards?";
    const testEmbedding = await generateEmbedding(testQuery);
    
    const searchResults = await qdrant.search(COLLECTION_NAME, {
      vector: testEmbedding,
      limit: 3,
      with_payload: true
    });
    
    console.log(`\nSearch results for: "${testQuery}"\n`);
    searchResults.forEach((result, i) => {
      console.log(`${i + 1}. Score: ${result.score.toFixed(3)}`);
      console.log(`   File: ${result.payload.filename}`);
      console.log(`   Section: ${result.payload.section || 'N/A'}`);
      console.log(`   Preview: ${result.payload.text.substring(0, 100)}...`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error during ingestion:', error);
    throw error;
  }
}

// Run the ingestion
ingestDirectMailKnowledge().catch(console.error);