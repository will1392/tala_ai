import dotenv from 'dotenv';
dotenv.config();

console.log('🧪 Testing Grok with your exact format...');

// Test Grok exactly as you specified
try {
  const { default: OpenAI } = await import('openai');
  
  const client = new OpenAI({
    api_key: process.env.GROK_API_KEY,
    base_url: "https://api.x.ai/v1",
  });

  console.log('📡 Sending request to Grok-3...');
  
  const completion = await client.chat.completions.create({
    model: "grok-3",
    messages: [
      {"role": "user", "content": "What is the meaning of life, the universe, and everything?"}
    ]
  });

  console.log('✅ Grok-3 Response:');
  console.log(completion.choices[0].message.content);
  console.log('\n📊 Usage:');
  console.log('Input tokens:', completion.usage?.prompt_tokens || 'N/A');
  console.log('Output tokens:', completion.usage?.completion_tokens || 'N/A');
  console.log('Total tokens:', completion.usage?.total_tokens || 'N/A');

} catch (error) {
  console.log('❌ Grok Error:');
  console.log('Status:', error.status || 'N/A');
  console.log('Message:', error.message);
  console.log('Full error:', JSON.stringify(error, null, 2));
}

// Also test what models are available
try {
  console.log('\n🔍 Checking available models...');
  const { default: OpenAI } = await import('openai');
  
  const client = new OpenAI({
    api_key: process.env.GROK_API_KEY,
    base_url: "https://api.x.ai/v1",
  });

  const models = await client.models.list();
  console.log('✅ Available models:');
  models.data.forEach(model => {
    console.log(`  - ${model.id}`);
  });

} catch (error) {
  console.log('❌ Model list error:', error.message);
}