import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSources() {
  console.log('🧪 Testing Knowledge Base Sources\n');

  const response = await fetch('http://localhost:3001/api/chat/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'mock-user-id'
    },
    body: JSON.stringify({
      message: "what can you tell me about Greece?",
      mode: "travel",
      searchKnowledge: true
    })
  });

  const data = await response.json();
  
  console.log('📥 Response structure:');
  console.log('   Success:', data.success);
  console.log('   Has sources:', !!data.sources);
  console.log('   Sources count:', data.sources?.length || 0);
  
  if (data.sources && data.sources.length > 0) {
    console.log('\n📝 Sources found:');
    data.sources.forEach((source, index) => {
      console.log(`   ${index + 1}. ${source.title} (${source.type}) - Score: ${(source.score * 100).toFixed(1)}%`);
    });
  } else {
    console.log('\n❌ No sources found in response');
    console.log('   Full response keys:', Object.keys(data));
    if (data.metadata) {
      console.log('   Metadata keys:', Object.keys(data.metadata));
    }
  }
  
  console.log('\n📄 Response preview:');
  console.log(data.response?.substring(0, 300) + '...');
}

testSources();