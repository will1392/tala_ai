/**
 * Test the restored simple knowledge base flow
 * This tests if the bypass for travel queries is working correctly
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const API_URL = 'http://localhost:3001';

async function testSimpleKBFlow() {
  console.log('🧪 Testing Restored Simple Knowledge Base Flow\n');
  console.log('=' . repeat(60));
  
  // Test queries that should use the simple flow
  const testQueries = [
    "Tell me about Greece",
    "What about Spain?",
    "Information about Iceland",
    "Give me a travel guide for Italy",
    "I want to visit Japan"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Testing: "${query}"`);
    console.log('-'.repeat(40));
    
    try {
      const response = await fetch(`${API_URL}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-1'
        },
        body: JSON.stringify({
          message: query,
          mode: 'travel',
          searchKnowledge: true
        })
      });
      
      if (!response.ok) {
        console.error(`❌ Request failed: ${response.status} ${response.statusText}`);
        const error = await response.text();
        console.error('Error:', error);
        continue;
      }
      
      const data = await response.json();
      
      console.log('✅ Response received');
      console.log('📊 Metadata:', {
        simpleFlow: data.metadata?.simpleFlow,
        mode: data.metadata?.mode,
        model: data.metadata?.model,
        hasSources: !!data.sources,
        sourcesCount: data.sources?.length || 0
      });
      
      if (data.sources && data.sources.length > 0) {
        console.log('📚 Sources found:');
        data.sources.forEach((source, i) => {
          console.log(`   ${i + 1}. ${source.title} (Score: ${source.score?.toFixed(2)})`);
        });
      }
      
      console.log('\n💬 Response preview:');
      console.log(data.response.substring(0, 200) + '...');
      
      // Check if it used the simple flow
      if (data.metadata?.simpleFlow === true) {
        console.log('✅ SIMPLE FLOW USED - Original KB functionality restored!');
      } else {
        console.log('⚠️  Complex flow used - bypass may not be working');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
  
  console.log('\n\n🎯 Summary:');
  console.log('The simple flow bypass should be working for travel information queries.');
  console.log('These queries should now directly access the knowledge base without');
  console.log('going through the complex intelligence system.');
}

// Run the test
testSimpleKBFlow().catch(console.error);