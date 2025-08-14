/**
 * Test that simple single-word queries like "greece" now work
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const API_URL = 'http://localhost:3001';

async function testGreeceQuery() {
  console.log('🧪 Testing Simple Greece Query\n');
  console.log('=' . repeat(60));
  
  // Test simple queries that should now work
  const testQueries = [
    "greece",
    "Greece",
    "spain", 
    "tell me about Greece",
    "hotels in spain"
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
        model: data.metadata?.model
      });
      
      if (data.sources && data.sources.length > 0) {
        console.log('📚 Sources found:');
        data.sources.forEach((source, i) => {
          console.log(`   ${i + 1}. ${source.title} (Score: ${source.score?.toFixed(2)})`);
        });
      }
      
      console.log('\n💬 Response preview:');
      const preview = data.response.substring(0, 200);
      console.log(preview + (data.response.length > 200 ? '...' : ''));
      
      // Check if it mentions the destination
      const destination = query.toLowerCase().replace(/tell me about|what about|information about/g, '').trim();
      if (data.response.toLowerCase().includes(destination)) {
        console.log(`✅ Response mentions ${destination}`);
      } else {
        console.log(`⚠️  Response doesn't mention ${destination}`);
      }
      
      // Check if it used the simple flow
      if (data.metadata?.simpleFlow === true) {
        console.log('✅ SIMPLE FLOW USED - KB access restored!');
      } else {
        console.log('⚠️  Complex flow used');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
  
  console.log('\n\n🎯 Summary:');
  console.log('With the updated code, ALL travel mode queries should now use');
  console.log('the simple flow, restoring the original KB functionality.');
  console.log('Single-word queries like "greece" should now return proper results.');
}

// Run the test
testGreeceQuery().catch(console.error);