#!/usr/bin/env node

/**
 * Hook Generator Knowledge Ingestion Script
 * 
 * Ingests hook writing documentation, best practices, and examples into Qdrant
 * for use by the hook generation service.
 * 
 * Usage:
 *   node server/scripts/ingest-hook-knowledge.js
 * 
 * Input: Place markdown files in server/knowledge/hook-generator/
 * Output: Vectors stored in Qdrant collection 'kb_hook_generator'
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import matter from 'gray-matter';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

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
const COLLECTION_NAME = 'kb_hook_generator';
const VECTOR_SIZE = 1536;
const BATCH_SIZE = 50;
const CHUNK_SIZE = 800; // words (hooks are typically shorter content)
const CHUNK_OVERLAP = 150; // words
const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge/hook-generator');

/**
 * Extract hook-specific metadata from content
 */
function extractHookMetadata(content, filename, frontmatter = {}) {
  const metadata = {
    category: 'hook_writing',
    filename: filename,
    ingested_at: new Date().toISOString(),
    ...frontmatter
  };

  const lower = content.toLowerCase();

  // Detect hook type/awareness level
  if (lower.includes('most aware') || lower.includes('brand-loyal')) {
    metadata.awareness_level = 'most_aware';
  } else if (lower.includes('product aware')) {
    metadata.awareness_level = 'product_aware';
  } else if (lower.includes('solution aware')) {
    metadata.awareness_level = 'solution_aware';
  } else if (lower.includes('problem aware')) {
    metadata.awareness_level = 'problem_aware';
  } else if (lower.includes('unaware') || lower.includes('cold audience')) {
    metadata.awareness_level = 'unaware';
  }

  // Detect hook style
  if (lower.includes('curiosity') || lower.includes('intrigue')) {
    metadata.hook_style = 'curiosity';
  } else if (lower.includes('benefit') || lower.includes('value proposition')) {
    metadata.hook_style = 'benefit';
  } else if (lower.includes('fear') || lower.includes('urgency') || lower.includes('scarcity')) {
    metadata.hook_style = 'fear_urgency';
  } else if (lower.includes('social proof') || lower.includes('testimonial')) {
    metadata.hook_style = 'social_proof';
  } else if (lower.includes('question') || lower.includes('asking')) {
    metadata.hook_style = 'question';
  } else if (lower.includes('story') || lower.includes('narrative')) {
    metadata.hook_style = 'story';
  }

  // Detect channel guidance
  if (lower.includes('email subject') || lower.includes('subject line')) {
    metadata.channel = 'email';
  } else if (lower.includes('paid ad') || lower.includes('facebook ad') || lower.includes('google ad')) {
    metadata.channel = 'paid_ads';
  } else if (lower.includes('organic') || lower.includes('social media post')) {
    metadata.channel = 'organic_social';
  } else if (lower.includes('landing page') || lower.includes('headline')) {
    metadata.channel = 'landing_page';
  }

  // Detect if it's examples vs. principles
  if (lower.includes('example:') || lower.includes('e.g.') || lower.match(/"\w+/)) {
    metadata.content_type = 'examples';
  } else if (lower.includes('principle') || lower.includes('rule') || lower.includes('guideline')) {
    metadata.content_type = 'principles';
  } else if (lower.includes('framework') || lower.includes('formula')) {
    metadata.content_type = 'framework';
  }

  // Detect industry/niche if mentioned
  if (lower.includes('luxury travel') || lower.includes('high-end travel')) {
    metadata.niche = 'luxury_travel';
  } else if (lower.includes('e-commerce') || lower.includes('ecommerce')) {
    metadata.niche = 'ecommerce';
  } else if (lower.includes('saas') || lower.includes('software')) {
    metadata.niche = 'saas';
  } else if (lower.includes('coaching') || lower.includes('consulting')) {
    metadata.niche = 'coaching_consulting';
  }

  return metadata;
}

/**
 * Chunk text into overlapping segments
 */
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const words = text.split(/\s+/);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push({
        text: chunk,
        start: i,
        end: Math.min(i + chunkSize, words.length)
      });
    }
  }
  
  return chunks;
}

/**
 * Process a single markdown file
 */
async function processMarkdownFile(filePath) {
  console.log(`  📄 Processing: ${path.basename(filePath)}`);
  
  const content = await fs.readFile(filePath, 'utf-8');
  const { data: frontmatter, content: markdownContent } = matter(content);
  
  // Chunk the content
  const chunks = chunkText(markdownContent);
  console.log(`     Split into ${chunks.length} chunks`);
  
  const points = [];
  
  for (const chunk of chunks) {
    // Generate embedding
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk.text
    });
    
    const metadata = extractHookMetadata(
      chunk.text,
      path.basename(filePath),
      frontmatter
    );
    
    points.push({
      id: uuidv4(),
      vector: embedding.data[0].embedding,
      payload: {
        content: chunk.text,
        chunk_index: chunk.start,
        metadata: metadata,
        source: 'hook_documentation'
      }
    });
  }
  
  return points;
}

/**
 * Ensure collection exists with proper schema
 */
async function ensureCollection() {
  try {
    // Try to get existing collection
    await qdrant.getCollection(COLLECTION_NAME);
    console.log(`✅ Collection "${COLLECTION_NAME}" already exists`);
    return false; // Collection exists
  } catch (error) {
    // Collection doesn't exist, create it
    console.log(`📦 Creating collection "${COLLECTION_NAME}"...`);
    
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine'
      },
      optimizers_config: {
        default_segment_number: 2
      },
      replication_factor: 1
    });
    
    // Create payload indices for filtering
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'metadata.awareness_level',
      field_schema: 'keyword'
    });
    
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'metadata.hook_style',
      field_schema: 'keyword'
    });
    
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'metadata.channel',
      field_schema: 'keyword'
    });
    
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'metadata.content_type',
      field_schema: 'keyword'
    });
    
    console.log('✅ Collection created with indices');
    return true; // New collection created
  }
}

/**
 * Main ingestion function
 */
async function ingestHookKnowledge() {
  console.log('🚀 Hook Generator Knowledge Ingestion\n');
  
  // Ensure knowledge directory exists
  try {
    await fs.access(KNOWLEDGE_DIR);
  } catch (error) {
    console.log(`📁 Creating knowledge directory: ${KNOWLEDGE_DIR}`);
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
    console.log('\n⚠️  Knowledge directory is empty!');
    console.log('   Add markdown files to:', KNOWLEDGE_DIR);
    console.log('\n💡 Example files to create:');
    console.log('   - hook-principles.md (core writing principles)');
    console.log('   - awareness-levels.md (Eugene Schwartz awareness stages)');
    console.log('   - hook-examples.md (proven hook examples)');
    console.log('   - style-guide.md (tone, voice, formatting rules)');
    console.log('   - channel-specific.md (email vs. ads vs. social)');
    console.log('   - luxury-travel-hooks.md (niche-specific examples)\n');
    return;
  }
  
  // Ensure collection exists
  const isNew = await ensureCollection();
  
  if (!isNew) {
    console.log('⚠️  Collection already has data. Clear it? (y/N)');
    // For automation, we'll skip and just add new data
    console.log('   Continuing with upsert (will update existing + add new)...\n');
  }
  
  // Read all markdown files
  const files = await fs.readdir(KNOWLEDGE_DIR);
  const markdownFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.markdown'));
  
  if (markdownFiles.length === 0) {
    console.log('⚠️  No markdown files found in:', KNOWLEDGE_DIR);
    console.log('\n💡 Add .md files with your hook documentation');
    return;
  }
  
  console.log(`📚 Found ${markdownFiles.length} markdown files\n`);
  
  // Process all files
  let allPoints = [];
  for (const file of markdownFiles) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const points = await processMarkdownFile(filePath);
    allPoints.push(...points);
  }
  
  console.log(`\n📊 Total vectors to upload: ${allPoints.length}`);
  
  // Upload in batches
  console.log('☁️  Uploading to Qdrant...');
  for (let i = 0; i < allPoints.length; i += BATCH_SIZE) {
    const batch = allPoints.slice(i, i + BATCH_SIZE);
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: batch
    });
    console.log(`   Uploaded ${Math.min(i + BATCH_SIZE, allPoints.length)}/${allPoints.length} vectors`);
  }
  
  // Verify
  const collectionInfo = await qdrant.getCollection(COLLECTION_NAME);
  console.log(`\n✅ Ingestion complete!`);
  console.log(`   Collection: ${COLLECTION_NAME}`);
  console.log(`   Total points: ${collectionInfo.points_count}`);
  console.log(`   Vector size: ${VECTOR_SIZE}`);
  
  console.log('\n🎯 Next steps:');
  console.log('   1. Update hookGenerationService.js to use this collection');
  console.log('   2. Add more documentation as needed');
  console.log('   3. Test hook generation with new knowledge base\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ingestHookKnowledge().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { ingestHookKnowledge, COLLECTION_NAME };
