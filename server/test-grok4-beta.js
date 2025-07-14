import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Testing Grok 4 and Beta Model Access...');

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
        messages: [{ role: 'user', content: 'Hello! What version of Grok are you and what are your capabilities?' }],
        max_tokens: 100,
        temperature: 0.7
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

async function testGrok4Models() {
  // All possible Grok 4 and beta model names
  const grok4Models = [
    // From the article
    'grok-beta',
    'grok-vision-beta',
    
    // Possible Grok 4 variations
    'grok-4',
    'grok-4-beta',
    'grok-4-preview',
    'grok-4-latest',
    'grok-4-vision',
    'grok-4-turbo',
    'grok-4-0709',
    'grok-4-1212',
    'grok-4-0125',
    
    // Other beta models
    'grok-preview',
    'grok-vision',
    'grok-multimodal',
    'grok-advanced',
    'grok-plus',
    'grok-pro'
  ];

  console.log(`🔑 Testing with API key: ${process.env.GROK_API_KEY?.substring(0, 20)}...`);
  console.log('Testing Grok 4 and beta model names...\n');

  const results = [];
  for (const model of grok4Models) {
    const result = await testGrokModel(model);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 GROK 4 & BETA MODEL AVAILABILITY');
  console.log('='.repeat(60));
  
  const working = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`✅ Working models: ${working.length}/${results.length}`);
  working.forEach(result => {
    console.log(`   ✅ ${result.model}`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Not available: ${failed.length}`);
    
    // Group by error type
    const access404 = failed.filter(r => r.error.includes('404') || r.error.includes('does not exist'));
    const accessDenied = failed.filter(r => r.error.includes('403') || r.error.includes('access'));
    const other = failed.filter(r => !access404.includes(r) && !accessDenied.includes(r));
    
    if (access404.length > 0) {
      console.log(`\n📋 Model Not Found (404): ${access404.length}`);
      access404.slice(0, 5).forEach(result => {
        console.log(`   ❌ ${result.model}`);
      });
      if (access404.length > 5) console.log(`   ... and ${access404.length - 5} more`);
    }
    
    if (accessDenied.length > 0) {
      console.log(`\n🚫 Access Denied (403): ${accessDenied.length}`);
      accessDenied.forEach(result => {
        console.log(`   🚫 ${result.model}`);
      });
    }
    
    if (other.length > 0) {
      console.log(`\n⚠️  Other Errors: ${other.length}`);
      other.forEach(result => {
        console.log(`   ⚠️  ${result.model}: ${result.error.substring(0, 50)}...`);
      });
    }
  }

  if (working.length > 0) {
    console.log('\n🎉 SUCCESS! Found working Grok 4/Beta models:');
    working.forEach(result => {
      console.log(`\n🤖 ${result.model}:`);
      console.log(`   Response: "${result.response.choices[0]?.message?.content || 'N/A'}"`);
      console.log(`   Model returned: ${result.response.model || 'N/A'}`);
    });
  } else {
    console.log('\n🤔 No Grok 4/Beta models accessible. Possible reasons:');
    console.log('   • Grok 4 requires special beta access or waitlist approval');
    console.log('   • Your API key tier doesn\'t include beta models');
    console.log('   • Different model naming convention than expected');
    console.log('   • Grok 4 not yet released for general API access');
    console.log('   • Try contacting xAI support for beta access');
  }

  return working.map(r => r.model);
}

testGrok4Models()
  .then(workingModels => {
    console.log('\n✨ Summary of working Grok 4/Beta models:', workingModels);
    if (workingModels.length === 0) {
      console.log('💡 Recommendation: Continue using Grok 3 models which are working well');
    }
  })
  .catch(console.error);