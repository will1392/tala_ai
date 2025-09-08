import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔄 RE-TESTING ANTHROPIC AND GROK');
console.log('=' .repeat(50));

// Test Anthropic with different models
console.log('\n🧪 Testing Anthropic Claude...');
const anthropicModels = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514'
];

for (const model of anthropicModels) {
  try {
    console.log(`\n🧪 Trying Anthropic model: ${model}`);
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ 
      apiKey: process.env.ANTHROPIC_API_KEY 
    });
    
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Say "Anthropic Claude is ready!"' }]
    });
    
    console.log(`✅ ${model}: SUCCESS`);
    console.log(`   Response: "${response.content[0].text}"`);
    console.log(`   Usage: ${response.usage.input_tokens}+${response.usage.output_tokens} tokens`);
    console.log(`   Cost: $${((response.usage.input_tokens * 0.003 + response.usage.output_tokens * 0.015) / 1000).toFixed(6)}`);
    break; // Stop on first success
    
  } catch (error) {
    console.log(`❌ ${model}: ${error.message.substring(0, 100)}...`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Test Grok with all available models
console.log('\n🧪 Testing Grok/X.AI...');

// First, get the actual available models
try {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    api_key: process.env.GROK_API_KEY,
    base_url: "https://api.x.ai/v1",
  });

  console.log('📋 Getting latest model list...');
  const models = await client.models.list();
  const grokModels = models.data
    .filter(m => m.id.toLowerCase().includes('grok'))
    .map(m => m.id);
    
  console.log(`Found ${grokModels.length} Grok models:`, grokModels);

  // Test each Grok model
  for (const model of grokModels) {
    try {
      console.log(`\n🧪 Trying Grok model: ${model}`);
      
      const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: 'Say "Grok is ready for Tala AI!"' }],
        max_tokens: 20
      });
      
      console.log(`✅ ${model}: SUCCESS`);
      console.log(`   Response: "${response.choices[0].message.content}"`);
      console.log(`   Usage: ${response.usage.total_tokens} tokens`);
      console.log(`   Cost: ~$${((response.usage.total_tokens * 0.005) / 1000).toFixed(6)}`);
      break; // Stop on first success
      
    } catch (error) {
      console.log(`❌ ${model}: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

} catch (error) {
  console.log('❌ Failed to get Grok model list:', error.message);
}

// Test some alternative approaches for Grok
console.log('\n🔧 Trying alternative Grok approaches...');

const alternativeGrokModels = [
  'grok-beta',
  'grok-1',
  'grok-2', 
  'grok',
  'xai-grok'
];

for (const model of alternativeGrokModels) {
  try {
    console.log(`\n🧪 Trying alternative: ${model}`);
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({
      api_key: process.env.GROK_API_KEY,
      base_url: "https://api.x.ai/v1",
    });
    
    const response = await client.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: 'Test' }],
      max_tokens: 5
    });
    
    console.log(`✅ ${model}: SUCCESS`);
    console.log(`   Response: "${response.choices[0].message.content}"`);
    break;
    
  } catch (error) {
    console.log(`❌ ${model}: ${error.message.substring(0, 80)}...`);
  }
}

// Check account status
console.log('\n🔍 Checking API account status...');

try {
  // Check Anthropic account
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  // Try a very minimal request
  await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'Hi' }]
  });
  
  console.log('✅ Anthropic account: Active');
} catch (error) {
  if (error.message.includes('credit balance')) {
    console.log('💳 Anthropic account: Low credit balance - needs top-up');
  } else if (error.message.includes('authentication')) {
    console.log('🔑 Anthropic account: Authentication issue');
  } else {
    console.log('❓ Anthropic account:', error.message.substring(0, 100));
  }
}

try {
  // Check Grok/X.AI account with a simple model list
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    api_key: process.env.GROK_API_KEY,
    base_url: "https://api.x.ai/v1",
  });
  
  const models = await client.models.list();
  console.log(`✅ Grok/X.AI account: Active (${models.data.length} models accessible)`);
  
} catch (error) {
  console.log('❌ Grok/X.AI account:', error.message);
}

console.log('\n✨ Re-test completed!');