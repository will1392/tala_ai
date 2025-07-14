import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Testing Known Available Grok Models...');

async function testGrokModel(modelName) {
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Hello! What model are you?' }],
        max_tokens: 50
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${modelName}: WORKS!`);
      console.log(`   Response: "${data.choices[0]?.message?.content || 'N/A'}"`);
      console.log(`   Model returned: ${data.model || 'N/A'}`);
      console.log(`   Usage: ${JSON.stringify(data.usage || {})}`);
      return { status: 'success', model: modelName, response: data };
    } else {
      const error = await response.text();
      console.log(`❌ ${modelName}: ${response.status} - ${error.substring(0, 200)}`);
      return { status: 'failed', model: modelName, error: `${response.status} - ${error}` };
    }
  } catch (error) {
    console.log(`❌ ${modelName}: ${error.message}`);
    return { status: 'failed', model: modelName, error: error.message };
  }
}

async function testAllAvailableModels() {
  // Based on xAI documentation and common model names
  const knownModels = [
    'grok-beta',
    'grok-2-1212',
    'grok-2-latest', 
    'grok-vision-beta',
    'grok-2',
    'grok-1',
    'grok',
    'grok-2-mini',
    'grok-2-turbo'
  ];

  console.log(`🔑 Testing with API key: ${process.env.GROK_API_KEY?.substring(0, 20)}...`);
  console.log('Testing known Grok model names...\n');

  const results = [];
  for (const model of knownModels) {
    const result = await testGrokModel(model);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 AVAILABLE GROK MODELS');
  console.log('='.repeat(60));
  
  const working = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`✅ Working models: ${working.length}/${results.length}`);
  working.forEach(result => {
    console.log(`   ✅ ${result.model}`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Not available: ${failed.length}`);
    failed.forEach(result => {
      console.log(`   ❌ ${result.model}: ${result.error.substring(0, 100)}`);
    });
  }

  if (working.length > 0) {
    console.log('\n🎉 SUCCESS! Found working Grok models:');
    working.forEach(result => {
      console.log(`\n🤖 ${result.model}:`);
      console.log(`   Response: "${result.response.choices[0]?.message?.content || 'N/A'}"`);
      console.log(`   Tokens: ${JSON.stringify(result.response.usage || {})}`);
    });
  }

  return working.map(r => r.model);
}

testAllAvailableModels()
  .then(workingModels => {
    console.log('\n✨ Summary of working Grok models:', workingModels);
  })
  .catch(console.error);