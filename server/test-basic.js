import dotenv from 'dotenv';
dotenv.config();

console.log('🧪 Basic LLM Test');
console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');
console.log('Anthropic Key:', process.env.ANTHROPIC_API_KEY ? 'Set' : 'Missing');
console.log('Google Key:', process.env.GOOGLE_AI_API_KEY ? 'Set' : 'Missing');
console.log('Grok Key:', process.env.GROK_API_KEY ? 'Set' : 'Missing');

// Test OpenAI
try {
  console.log('\n🧪 Testing OpenAI...');
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Say "OpenAI works"' }],
    max_tokens: 10
  });
  
  console.log('✅ OpenAI Response:', response.choices[0].message.content);
} catch (error) {
  console.log('❌ OpenAI Error:', error.message);
}

// Test Anthropic
try {
  console.log('\n🧪 Testing Anthropic...');
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Say "Anthropic works"' }]
  });
  
  console.log('✅ Anthropic Response:', response.content[0].text);
} catch (error) {
  console.log('❌ Anthropic Error:', error.message);
}

// Test Google
try {
  console.log('\n🧪 Testing Google...');
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const result = await model.generateContent('Say "Google works"');
  console.log('✅ Google Response:', result.response.text());
} catch (error) {
  console.log('❌ Google Error:', error.message);
}

console.log('\n✅ Basic tests completed!');