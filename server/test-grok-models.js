import dotenv from 'dotenv';
dotenv.config();

console.log('🚀 Testing Actual Grok Models');
console.log('=' .repeat(40));

const grokModels = [
  'grok-3',
  'grok-3-fast', 
  'grok-3-mini',
  'grok-3-mini-fast',
  'grok-2-1212',
  'grok-4-0709'
];

const results = {};

for (const modelName of grokModels) {
  try {
    console.log(`\n🧪 Testing ${modelName}...`);
    const { default: OpenAI } = await import('openai');
    
    const client = new OpenAI({
      api_key: process.env.GROK_API_KEY,
      base_url: "https://api.x.ai/v1",
    });

    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        {"role": "user", "content": "Say 'Grok is ready for Tala AI travel assistant!'"}
      ],
      max_tokens: 30
    });
    const duration = Date.now() - startTime;

    results[modelName] = {
      status: 'success',
      response: completion.choices[0].message.content,
      usage: completion.usage,
      duration: duration
    };

    console.log(`✅ ${modelName}: SUCCESS (${duration}ms)`);
    console.log(`   Response: "${completion.choices[0].message.content}"`);
    console.log(`   Tokens: ${completion.usage.total_tokens} (${completion.usage.prompt_tokens}+${completion.usage.completion_tokens})`);

  } catch (error) {
    results[modelName] = {
      status: 'failed',
      error: error.message
    };
    console.log(`❌ ${modelName}: ${error.message}`);
  }

  // Small delay between requests
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Summary
console.log('\n' + '=' .repeat(40));
console.log('📊 GROK MODELS SUMMARY');
console.log('=' .repeat(40));

const working = Object.values(results).filter(r => r.status === 'success').length;
const total = Object.keys(results).length;

console.log(`✅ Working: ${working}/${total} Grok models`);

console.log('\n🏆 WORKING MODELS:');
for (const [model, result] of Object.entries(results)) {
  if (result.status === 'success') {
    console.log(`✅ ${model.padEnd(18)}: ${result.duration}ms, ${result.usage.total_tokens} tokens`);
  }
}

console.log('\n❌ FAILED MODELS:');
for (const [model, result] of Object.entries(results)) {
  if (result.status === 'failed') {
    console.log(`❌ ${model.padEnd(18)}: ${result.error}`);
  }
}

// Recommend best model
if (working > 0) {
  const fastest = Object.entries(results)
    .filter(([_, r]) => r.status === 'success')
    .sort((a, b) => a[1].duration - b[1].duration)[0];
    
  console.log(`\n🚀 RECOMMENDED: ${fastest[0]} (fastest at ${fastest[1].duration}ms)`);
  console.log(`   Update your config to use: "${fastest[0]}"`);
}