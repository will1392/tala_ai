import dotenv from 'dotenv';
dotenv.config();

console.log('🧪 TESTING SPECIFIC GROK MODELS');
console.log('=' .repeat(50));

const specificGrokModels = [
  'grok-4-0709',
  'grok-3', 
  'grok-3-mini'
];

console.log('API Key:', process.env.GROK_API_KEY ? `${process.env.GROK_API_KEY.substring(0, 10)}...` : 'Missing');
console.log('Base URL: https://api.x.ai/v1');

const results = {};

for (const model of specificGrokModels) {
  try {
    console.log(`\n🧪 Testing ${model}...`);
    const { default: OpenAI } = await import('openai');
    
    const client = new OpenAI({
      api_key: process.env.GROK_API_KEY,
      base_url: "https://api.x.ai/v1",
    });

    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        {"role": "user", "content": "Say 'Grok is ready for Tala AI travel assistant!'"}
      ],
      max_tokens: 30
    });
    const duration = Date.now() - startTime;

    results[model] = {
      status: 'success',
      response: completion.choices[0].message.content,
      usage: completion.usage,
      duration: duration
    };

    console.log(`✅ ${model}: SUCCESS (${duration}ms)`);
    console.log(`   Response: "${completion.choices[0].message.content}"`);
    console.log(`   Tokens: ${completion.usage.total_tokens} (${completion.usage.prompt_tokens}+${completion.usage.completion_tokens})`);
    console.log(`   Model returned: ${completion.model || 'N/A'}`);
    
    // Calculate estimated cost (rough estimate)
    const estimatedCost = (completion.usage.total_tokens * 0.005 / 1000).toFixed(6);
    console.log(`   Estimated cost: $${estimatedCost}`);

  } catch (error) {
    results[model] = {
      status: 'failed',
      error: error.message,
      statusCode: error.status || 'unknown'
    };
    
    console.log(`❌ ${model}: FAILED`);
    console.log(`   Status: ${error.status || 'unknown'}`);
    console.log(`   Error: ${error.message}`);
    
    // If it's a specific error code, provide more context
    if (error.status === 404) {
      console.log(`   💡 This means the model doesn't exist or you don't have access`);
    } else if (error.status === 401) {
      console.log(`   💡 This means authentication failed - check API key`);
    } else if (error.status === 403) {
      console.log(`   💡 This means forbidden - likely need billing/subscription`);
    } else if (error.status === 429) {
      console.log(`   💡 This means rate limited - try again later`);
    }
  }

  // Small delay between requests
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Try a different approach - check what we can actually access
console.log('\n🔍 Checking what models are actually accessible...');
try {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    api_key: process.env.GROK_API_KEY,
    base_url: "https://api.x.ai/v1",
  });

  const models = await client.models.list();
  console.log(`📋 Total models available: ${models.data.length}`);
  
  // Filter for any Grok-related models
  const grokModels = models.data.filter(m => 
    m.id.toLowerCase().includes('grok') || 
    m.id.toLowerCase().includes('xai')
  );
  
  console.log(`🔍 Grok-related models found: ${grokModels.length}`);
  if (grokModels.length > 0) {
    grokModels.forEach(model => {
      console.log(`   - ${model.id} (created: ${new Date(model.created * 1000).toLocaleDateString()})`);
    });
  } else {
    console.log('   ❌ No Grok models found in available list');
  }
  
  // Show a sample of other available models
  console.log('\n📋 Sample of available models:');
  models.data.slice(0, 10).forEach(model => {
    console.log(`   - ${model.id}`);
  });
  if (models.data.length > 10) {
    console.log(`   ... and ${models.data.length - 10} more`);
  }

} catch (error) {
  console.log('❌ Failed to list models:', error.message);
}

// Summary
console.log('\n' + '=' .repeat(50));
console.log('📊 GROK TESTING SUMMARY');
console.log('=' .repeat(50));

const working = Object.values(results).filter(r => r.status === 'success').length;
const failed = Object.values(results).filter(r => r.status === 'failed').length;

console.log(`✅ Working: ${working}/${specificGrokModels.length} models`);
console.log(`❌ Failed: ${failed}/${specificGrokModels.length} models`);

if (working > 0) {
  console.log('\n🎉 WORKING GROK MODELS:');
  for (const [model, result] of Object.entries(results)) {
    if (result.status === 'success') {
      console.log(`✅ ${model.padEnd(15)}: ${result.duration}ms, ${result.usage.total_tokens} tokens`);
      console.log(`   Response: "${result.response}"`);
    }
  }
} else {
  console.log('\n❌ NO GROK MODELS WORKING');
  console.log('   This suggests the account needs:');
  console.log('   • Billing/subscription setup');
  console.log('   • Special access approval');
  console.log('   • Different API key permissions');
}

console.log('\n💡 RECOMMENDATIONS:');
if (working === 0) {
  console.log('1. Check X.AI billing and subscription status');
  console.log('2. Verify if Grok API access requires special approval');
  console.log('3. Contact X.AI support for access to Grok models');
  console.log('4. Continue with current 3-provider setup (OpenAI + Anthropic + Google)');
} else {
  console.log('1. Update LLM config with working Grok models');
  console.log('2. Add to fallback chain');
  console.log('3. Monitor costs and performance');
}

console.log('\n✨ Grok testing completed!');