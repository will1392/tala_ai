import dotenv from 'dotenv';
dotenv.config();

console.log('🧪 TESTING GROK-3-LATEST (from your curl example)');
console.log('=' .repeat(60));

// Test the exact model from your curl command
const testModel = 'grok-3-latest';

try {
  console.log(`🧪 Testing ${testModel}...`);
  console.log('Using exact format from your curl command');
  
  const { default: OpenAI } = await import('openai');
  
  const client = new OpenAI({
    api_key: process.env.GROK_API_KEY,
    base_url: "https://api.x.ai/v1",
  });

  const startTime = Date.now();
  const completion = await client.chat.completions.create({
    model: testModel,
    messages: [
      {
        "role": "user", 
        "content": "What is the meaning of life, the universe, and everything?"
      }
    ],
    stream: false,
    temperature: 0.7
  });
  const duration = Date.now() - startTime;

  console.log(`✅ ${testModel}: SUCCESS! (${duration}ms)`);
  console.log('=' .repeat(60));
  console.log('📝 RESPONSE:');
  console.log(completion.choices[0].message.content);
  console.log('=' .repeat(60));
  console.log('📊 USAGE STATS:');
  console.log(`   Model: ${completion.model || testModel}`);
  console.log(`   Input tokens: ${completion.usage?.prompt_tokens || 'N/A'}`);
  console.log(`   Output tokens: ${completion.usage?.completion_tokens || 'N/A'}`);
  console.log(`   Total tokens: ${completion.usage?.total_tokens || 'N/A'}`);
  console.log(`   Duration: ${duration}ms`);
  
  if (completion.usage?.total_tokens) {
    const estimatedCost = (completion.usage.total_tokens * 0.005 / 1000).toFixed(6);
    console.log(`   Estimated cost: $${estimatedCost}`);
  }

  console.log('\n🎉 GROK IS WORKING!');
  console.log('   The key was using "grok-3-latest" instead of just "grok-3"');

} catch (error) {
  console.log(`❌ ${testModel}: FAILED`);
  console.log(`   Status: ${error.status || 'unknown'}`);
  console.log(`   Error: ${error.message}`);
  console.log(`   Type: ${error.type || 'unknown'}`);
  
  if (error.status === 404) {
    console.log(`   💡 Model still not found - may need different version`);
  }
}

// Also test some variations of the "latest" pattern
console.log('\n🔍 Testing other "latest" model patterns...');

const latestPatterns = [
  'grok-latest',
  'grok-2-latest', 
  'grok-3-latest',
  'grok-4-latest',
  'grok-beta-latest'
];

for (const model of latestPatterns) {
  try {
    console.log(`\n🧪 Testing ${model}...`);
    const { default: OpenAI } = await import('openai');
    
    const client = new OpenAI({
      api_key: process.env.GROK_API_KEY,
      base_url: "https://api.x.ai/v1",
    });

    const completion = await client.chat.completions.create({
      model: model,
      messages: [{"role": "user", "content": "Hello"}],
      max_tokens: 5
    });

    console.log(`✅ ${model}: WORKS!`);
    console.log(`   Response: "${completion.choices[0].message.content}"`);
    
  } catch (error) {
    console.log(`❌ ${model}: ${error.message.substring(0, 50)}...`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
}

console.log('\n✨ Grok-latest testing completed!');