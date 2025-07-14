import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Testing Grok 3 Model Name Variations...');

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
        messages: [{ role: 'user', content: 'Hello! What Grok version are you?' }],
        max_tokens: 50
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${modelName}: WORKS!`);
      console.log(`   Response: "${data.choices[0]?.message?.content || 'N/A'}"`);
      console.log(`   Model returned: ${data.model || 'N/A'}`);
      return { status: 'success', model: modelName, response: data };
    } else {
      const error = await response.text();
      console.log(`❌ ${modelName}: ${response.status} - ${error.substring(0, 150)}`);
      return { status: 'failed', model: modelName, error: `${response.status} - ${error}` };
    }
  } catch (error) {
    console.log(`❌ ${modelName}: ${error.message}`);
    return { status: 'failed', model: modelName, error: error.message };
  }
}

async function testAllGrok3Variations() {
  // Try various possible Grok 3 model names
  const grok3Variations = [
    'grok-3',
    'grok-3.0',
    'grok-3-latest', 
    'grok-3-1212',
    'grok-3.1',
    'grok-3-fast',
    'grok-3-turbo',
    'grok-3-mini',
    'grok-3-beta',
    'grok-3-preview',
    'grok-v3',
    'grok3',
    'grok-3.5',
    'grok-3-0125',
    'grok-3-0709'
  ];

  console.log(`🔑 Testing with API key: ${process.env.GROK_API_KEY?.substring(0, 20)}...`);
  console.log('Testing Grok 3 model name variations...\n');

  const results = [];
  for (const model of grok3Variations) {
    const result = await testGrokModel(model);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 800)); // Rate limiting
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 GROK 3 MODEL AVAILABILITY');
  console.log('='.repeat(60));
  
  const working = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`✅ Working Grok 3 models: ${working.length}/${results.length}`);
  working.forEach(result => {
    console.log(`   ✅ ${result.model}`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Not available: ${failed.length}`);
    failed.forEach(result => {
      const errorShort = result.error.substring(0, 80);
      console.log(`   ❌ ${result.model}: ${errorShort}${result.error.length > 80 ? '...' : ''}`);
    });
  }

  if (working.length > 0) {
    console.log('\n🎉 SUCCESS! Found working Grok 3 models:');
    working.forEach(result => {
      console.log(`\n🤖 ${result.model}:`);
      console.log(`   Response: "${result.response.choices[0]?.message?.content || 'N/A'}"`);
      console.log(`   Model returned: ${result.response.model || 'N/A'}`);
    });
  } else {
    console.log('\n😔 No Grok 3 models found. Possible reasons:');
    console.log('   • Grok 3 not yet released');
    console.log('   • Different model naming convention');
    console.log('   • Requires special access/beta permissions');
    console.log('   • Model name is completely different');
  }

  return working.map(r => r.model);
}

testAllGrok3Variations()
  .then(workingModels => {
    console.log('\n✨ Summary of working Grok 3 models:', workingModels);
    if (workingModels.length === 0) {
      console.log('🔍 Consider checking xAI documentation or console for exact model names');
    }
  })
  .catch(console.error);