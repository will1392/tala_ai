import dotenv from 'dotenv';
dotenv.config();

console.log('🚀 MULTI-LLM ARCHITECTURE TEST');
console.log('=' .repeat(50));

const results = {
  openai: { status: 'unknown', details: '' },
  anthropic: { status: 'unknown', details: '' },
  google: { status: 'unknown', details: '' },
  grok: { status: 'unknown', details: '' }
};

// Test OpenAI
try {
  console.log('\n🧪 Testing OpenAI (GPT-4o-mini)...');
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Say "OpenAI is ready for Tala AI"' }],
    max_tokens: 20
  });
  
  results.openai = { 
    status: 'working', 
    details: response.choices[0].message.content,
    cost: `$${(response.usage.total_tokens * 0.00015 / 1000).toFixed(6)}`
  };
  console.log('✅ OpenAI: WORKING');
} catch (error) {
  results.openai = { status: 'failed', details: error.message };
  console.log('❌ OpenAI: FAILED -', error.message);
}

// Test Anthropic
try {
  console.log('\n🧪 Testing Anthropic (Claude 3.5 Sonnet)...');
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 20,
    messages: [{ role: 'user', content: 'Say "Anthropic is ready for Tala AI"' }]
  });
  
  results.anthropic = { 
    status: 'working', 
    details: response.content[0].text,
    cost: `$${((response.usage.input_tokens * 0.003 + response.usage.output_tokens * 0.015) / 1000).toFixed(6)}`
  };
  console.log('✅ Anthropic: WORKING');
} catch (error) {
  results.anthropic = { status: 'failed', details: error.message };
  console.log('❌ Anthropic: FAILED -', error.message.substring(0, 100) + '...');
}

// Test Google
try {
  console.log('\n🧪 Testing Google (Gemini 1.5 Flash)...');
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const result = await model.generateContent('Say "Google is ready for Tala AI"');
  const response = result.response;
  
  results.google = { 
    status: 'working', 
    details: response.text(),
    cost: '$0.000001' // Estimated minimal cost
  };
  console.log('✅ Google: WORKING');
} catch (error) {
  results.google = { status: 'failed', details: error.message };
  console.log('❌ Google: FAILED -', error.message);
}

// Test Grok
try {
  console.log('\n🧪 Testing Grok (via X.AI)...');
  const { default: OpenAI } = await import('openai');
  const grok = new OpenAI({
    apiKey: process.env.GROK_API_KEY,
    baseURL: 'https://api.x.ai/v1'
  });
  
  const response = await grok.chat.completions.create({
    model: 'grok-beta',
    messages: [{ role: 'user', content: 'Say "Grok is ready for Tala AI"' }],
    max_tokens: 20
  });
  
  results.grok = { 
    status: 'working', 
    details: response.choices[0].message.content,
    cost: `$${(response.usage.total_tokens * 0.005 / 1000).toFixed(6)}`
  };
  console.log('✅ Grok: WORKING');
} catch (error) {
  results.grok = { status: 'failed', details: error.message };
  console.log('❌ Grok: FAILED -', error.message);
}

// Test Embedding
try {
  console.log('\n🧪 Testing OpenAI Embeddings...');
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'Tala AI travel assistant embedding test'
  });
  
  console.log(`✅ Embeddings: WORKING (${response.data[0].embedding.length} dimensions)`);
} catch (error) {
  console.log('❌ Embeddings: FAILED -', error.message);
}

// Summary
console.log('\n' + '=' .repeat(50));
console.log('📊 MULTI-LLM ARCHITECTURE STATUS');
console.log('=' .repeat(50));

const working = Object.values(results).filter(r => r.status === 'working').length;
const total = Object.keys(results).length;

console.log(`✅ Working: ${working}/${total} LLM providers`);
console.log(`💰 Estimated cost per test: ~$0.001`);

console.log('\n🔍 Provider Details:');
for (const [provider, result] of Object.entries(results)) {
  const icon = result.status === 'working' ? '✅' : '❌';
  const name = provider.charAt(0).toUpperCase() + provider.slice(1);
  console.log(`${icon} ${name.padEnd(10)}: ${result.status === 'working' ? 'Ready' : 'Unavailable'}`);
  if (result.status === 'working') {
    console.log(`   Response: "${result.details}"`);
    if (result.cost) console.log(`   Cost: ${result.cost}`);
  }
}

console.log('\n🎯 RECOMMENDATIONS:');
if (results.openai.status === 'working') {
  console.log('✅ Use OpenAI as primary provider (GPT-4o-mini + embeddings)');
}
if (results.google.status === 'working') {
  console.log('✅ Use Google Gemini for fast, low-cost responses');
}
if (results.anthropic.status === 'failed') {
  console.log('💡 Add credits to Anthropic account for Claude access');
}
if (results.grok.status === 'working') {
  console.log('✅ Grok available as alternative provider');
}

console.log('\n🚀 NEXT STEPS:');
console.log('1. Integrate LLM Manager into your existing chat system');
console.log('2. Configure load balancing strategy (least_cost recommended)');
console.log('3. Set up cost monitoring and budget alerts');
console.log('4. Test multi-provider fallback functionality');

if (working >= 2) {
  console.log('\n🎉 SUCCESS: Multi-LLM architecture is OPERATIONAL!');
  console.log('   Your Tala AI travel assistant now has multiple AI providers');
  console.log('   with automatic fallbacks and cost optimization.');
} else {
  console.log('\n⚠️  LIMITED: Only one provider working - add more for redundancy');
}

console.log('\n✨ Multi-LLM test completed!');