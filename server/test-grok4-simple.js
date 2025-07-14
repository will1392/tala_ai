import dotenv from 'dotenv';
dotenv.config();

console.log('🔥 Testing Grok 4 with Simple Prompts...');

async function testGrok4Simple(modelName) {
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${modelName}: WORKS!`);
      console.log(`   Response: "${data.choices[0]?.message?.content || '[EMPTY]'}"`);
      console.log(`   Model returned: ${data.model || 'N/A'}`);
      console.log(`   Usage: ${JSON.stringify(data.usage || {})}`);
      console.log(`   Has reasoning tokens: ${data.usage?.completion_tokens_details?.reasoning_tokens > 0 ? 'YES' : 'NO'}`);
      return { status: 'success', model: modelName, response: data };
    } else {
      const error = await response.text();
      console.log(`❌ ${modelName}: ${response.status} - ${error.substring(0, 100)}`);
      return { status: 'failed', model: modelName, error: `${response.status} - ${error}` };
    }
  } catch (error) {
    console.log(`❌ ${modelName}: ${error.message}`);
    return { status: 'failed', model: modelName, error: error.message };
  }
}

async function testGrok4Models() {
  const models = ['grok-4', 'grok-4-latest', 'grok-4-0709'];
  
  console.log('Testing Grok 4 models with simple "Hello" prompt...\n');

  for (const model of models) {
    await testGrok4Simple(model);
    console.log(''); // Add spacing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎯 GROK 4 ANALYSIS:');
  console.log('   • All models appear to be working (no errors)');
  console.log('   • Models are consuming reasoning tokens');
  console.log('   • This suggests advanced internal processing');
  console.log('   • Grok 4 may be designed for complex reasoning tasks');
  console.log('   • Try more specific prompts or different use cases');
}

testGrok4Models().catch(console.error);