import dotenv from 'dotenv';
dotenv.config();

console.log('🔬 TESTING GROK WITH DIRECT FETCH (Python approach)');
console.log('=' .repeat(60));

const testModel = 'grok-4-0709'; // This worked in Python!

console.log(`🔑 API Key: ${process.env.GROK_API_KEY?.substring(0, 10)}...`);
console.log(`🎯 Testing model: ${testModel}`);

try {
  console.log('\n🌐 Using direct fetch (same as Python requests)...');
  
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`
    },
    body: JSON.stringify({
      model: testModel,
      messages: [
        { role: "system", content: "You are a PhD-level mathematician." },
        { role: "user", content: "What is 2 + 2?" }
      ],
      temperature: 0,
      max_tokens: 50
    })
  });

  console.log(`📊 Response status: ${response.status}`);
  console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('🎉 SUCCESS with direct fetch!');
    console.log('📝 Full response:', JSON.stringify(data, null, 2));
    console.log(`✅ Content: "${data.choices[0].message.content}"`);
    console.log(`📊 Usage: ${data.usage.total_tokens} tokens`);
    console.log(`💰 Cost: $${(data.usage.total_tokens * 0.005 / 1000).toFixed(6)}`);
    
    // Now test with OpenAI client using same model
    console.log('\n🔄 Comparing with OpenAI client...');
    const { default: OpenAI } = await import('openai');
    
    const client = new OpenAI({
      api_key: process.env.GROK_API_KEY,
      base_url: "https://api.x.ai/v1",
    });
    
    try {
      const completion = await client.chat.completions.create({
        model: testModel,
        messages: [
          { role: "user", content: "What is 3 + 3?" }
        ],
        max_tokens: 10
      });
      
      console.log('✅ OpenAI client also works!');
      console.log(`   Response: "${completion.choices[0].message.content}"`);
      
    } catch (clientError) {
      console.log('❌ OpenAI client failed:');
      console.log(`   Error: ${clientError.message}`);
      console.log(`   Status: ${clientError.status}`);
    }
    
  } else {
    console.log('❌ Failed with direct fetch');
    console.log('📝 Error response:', JSON.stringify(data, null, 2));
  }

} catch (error) {
  console.log('❌ Fetch error:', error.message);
}

// Test all the models we found in Python
console.log('\n🔍 Testing all models found in Python...');
const pythonModels = [
  'grok-2-1212',
  'grok-2-vision-1212',
  'grok-3',
  'grok-3-fast', 
  'grok-3-mini',
  'grok-4-0709'
];

for (const model of pythonModels) {
  try {
    console.log(`\n🧪 Testing ${model} with fetch...`);
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${model}: SUCCESS!`);
      console.log(`   Response: "${data.choices[0].message.content}"`);
      console.log(`   Tokens: ${data.usage.total_tokens}`);
      break; // Stop on first success
    } else {
      const errorData = await response.json();
      console.log(`❌ ${model}: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.log(`❌ ${model}: ${error.message}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
}

console.log('\n' + '=' .repeat(60));
console.log('🎯 DIRECT FETCH TEST CONCLUSION');
console.log('=' .repeat(60));

console.log('🔍 Key findings:');
console.log('   • Python requests: ✅ Working');
console.log('   • Node.js fetch: Testing...');
console.log('   • OpenAI SDK: Testing...');

console.log('\n✨ Direct fetch test completed!');