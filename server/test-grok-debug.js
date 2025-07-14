import dotenv from 'dotenv';
dotenv.config();

console.log('🧪 Debugging Grok API Access...');
console.log('API Key:', process.env.GROK_API_KEY ? `${process.env.GROK_API_KEY.substring(0, 10)}...` : 'Missing');

// Test different model names that might be available
const modelsToTry = [
  'grok-3',
  'grok-beta', 
  'grok-2',
  'grok-1',
  'grok',
  'xai-grok',
  'gpt-4', // Fallback to see if OpenAI models work through X.AI
];

for (const modelName of modelsToTry) {
  try {
    console.log(`\n🧪 Trying model: ${modelName}`);
    const { default: OpenAI } = await import('openai');
    
    const client = new OpenAI({
      api_key: process.env.GROK_API_KEY,
      base_url: "https://api.x.ai/v1",
    });

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        {"role": "user", "content": "Hello"}
      ],
      max_tokens: 10
    });

    console.log(`✅ ${modelName} WORKS!`);
    console.log('Response:', completion.choices[0].message.content);
    console.log('Usage:', completion.usage);
    break; // Stop on first success

  } catch (error) {
    console.log(`❌ ${modelName}: ${error.message}`);
  }
}

// Let's also try a direct curl-like request to see what's happening
console.log('\n🔍 Raw API Information:');
console.log('Base URL: https://api.x.ai/v1');
console.log('Endpoint: https://api.x.ai/v1/models');

// Check if this is actually a Grok API or if it's redirecting to OpenAI
try {
  const response = await fetch('https://api.x.ai/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  if (response.ok) {
    const data = await response.json();
    console.log('Raw response data object keys:', Object.keys(data));
    if (data.data && Array.isArray(data.data)) {
      console.log('Number of models:', data.data.length);
      const grokModels = data.data.filter(m => m.id.toLowerCase().includes('grok'));
      console.log('Grok models found:', grokModels.map(m => m.id));
    }
  }
} catch (error) {
  console.log('Fetch error:', error.message);
}