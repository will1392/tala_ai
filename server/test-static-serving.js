import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

console.log('Testing static file serving...\n');

async function testEndpoint(path, description) {
  try {
    const response = await fetch(`${BASE_URL}${path}`);
    console.log(`${description}:`);
    console.log(`  Path: ${path}`);
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 404) {
      const text = await response.text();
      console.log(`  Response: ${text.substring(0, 100)}...`);
    }
    
    console.log('');
  } catch (error) {
    console.log(`${description}: ERROR - ${error.message}\n`);
  }
}

// Test various endpoints
await testEndpoint('/', 'Homepage (should serve index.html)');
await testEndpoint('/dashboard', 'Dashboard route (should serve index.html for SPA)');
await testEndpoint('/index.html', 'Direct index.html request');
await testEndpoint('/assets/index-CbZ7Rg03.js', 'JavaScript bundle');
await testEndpoint('/assets/index-DI-aWa-Z.css', 'CSS bundle');
await testEndpoint('/api/health', 'API health check');
await testEndpoint('/api/tasks', 'API tasks endpoint');
await testEndpoint('/api/nonexistent', 'Non-existent API endpoint');

console.log('Test complete!');