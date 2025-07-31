/**
 * Initialize CMO Knowledge Base
 * 
 * This script initializes the CMO knowledge base and creates
 * the Qdrant collection for marketing knowledge.
 */

import { cmoKnowledgeBase } from '../services/cmo/CMOKnowledgeBase.js';
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeCMOKnowledge() {
  console.log('🚀 Initializing CMO Knowledge Base...\n');
  
  try {
    // Check Qdrant connection
    const qdrant = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    });
    
    console.log('🔍 Checking Qdrant connection...');
    const collections = await qdrant.getCollections();
    console.log(`✅ Connected to Qdrant. Found ${collections.collections.length} collections.\n`);
    
    // Initialize knowledge base
    await cmoKnowledgeBase.initialize();
    
    // Get statistics
    const stats = cmoKnowledgeBase.getStats();
    
    console.log('\n📊 Knowledge Base Statistics:');
    console.log(`Total items: ${stats.totalItems}`);
    console.log('\nBy Category:');
    
    for (const [category, categoryStats] of Object.entries(stats.categories)) {
      console.log(`\n${category}:`);
      console.log(`  Total: ${categoryStats.count} items`);
      console.log('  Types:');
      for (const [type, count] of Object.entries(categoryStats.types)) {
        console.log(`    - ${type}: ${count}`);
      }
    }
    
    // Test search functionality
    console.log('\n🧪 Testing search functionality...');
    
    const testQueries = [
      { query: 'title tag best practices', category: 'seo' },
      { query: 'email subject line tips', category: 'email' },
      { query: 'how to improve open rates', category: null }
    ];
    
    for (const test of testQueries) {
      console.log(`\nSearching: "${test.query}" ${test.category ? `in ${test.category}` : '(all categories)'}`);
      const results = await cmoKnowledgeBase.search(test.query, {
        category: test.category,
        limit: 3
      });
      
      if (results.length > 0) {
        console.log(`Found ${results.length} results:`);
        results.forEach((result, i) => {
          console.log(`  ${i + 1}. ${result.title} (${result.category}) - Score: ${result.score.toFixed(3)}`);
        });
      } else {
        console.log('  No results found');
      }
    }
    
    console.log('\n✅ CMO Knowledge Base initialization complete!');
    
    // Add some sample knowledge if the database is empty
    if (stats.totalItems === 0) {
      console.log('\n📝 Adding sample knowledge items...');
      
      await cmoKnowledgeBase.addKnowledge('seo', {
        type: 'tip',
        topic: 'general',
        title: 'Quick SEO Tip',
        content: 'Always include your primary keyword in the first 100 words of your content.',
        metadata: { source: 'initialization' }
      });
      
      await cmoKnowledgeBase.addKnowledge('email', {
        type: 'tip',
        topic: 'general',
        title: 'Email Marketing Tip',
        content: 'Test your emails on mobile devices - over 60% of emails are opened on mobile.',
        metadata: { source: 'initialization' }
      });
      
      console.log('✅ Added sample knowledge items');
    }
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
initializeCMOKnowledge();