import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import request from 'supertest';
import apiRoutes from './api-metrics-endpoint.js';

console.log('🌐 TESTING API METRICS ENDPOINTS');
console.log('=' .repeat(50));

/**
 * Test all API endpoints for the metrics system
 */
async function testAPIEndpoints() {
  // Create Express app for testing
  const app = express();
  app.use(express.json());
  app.use('/api/llm', apiRoutes);

  console.log('\n🔍 TESTING BASIC ENDPOINTS');
  console.log('-'.repeat(30));

  // Test basic metrics endpoint
  await testEndpoint(app, 'GET', '/api/llm/metrics', null, 'Comprehensive Metrics');
  
  // Test metrics with time range
  await testEndpoint(app, 'GET', '/api/llm/metrics?timeRange=24h&format=dashboard', null, 'Dashboard Format');

  // Test performance metrics
  await testEndpoint(app, 'GET', '/api/llm/metrics/performance', null, 'Performance Metrics');

  // Test cost metrics
  await testEndpoint(app, 'GET', '/api/llm/metrics/costs', null, 'Cost Metrics');

  // Test health metrics
  await testEndpoint(app, 'GET', '/api/llm/metrics/health', null, 'Health Status');

  // Test alerts
  await testEndpoint(app, 'GET', '/api/llm/metrics/alerts', null, 'System Alerts');

  // Test sample data
  await testEndpoint(app, 'GET', '/api/llm/metrics/sample', null, 'Sample Dashboard Data');

  console.log('\n🔧 TESTING POST ENDPOINTS');
  console.log('-'.repeat(30));

  // Test export functionality
  await testEndpoint(app, 'POST', '/api/llm/metrics/export', {
    format: 'json',
    timeRange: 86400000,
    includeRawData: false
  }, 'Data Export');

  // Test budget update
  await testEndpoint(app, 'PUT', '/api/llm/metrics/budget', {
    dailyBudget: 25.00,
    monthlyBudget: 500.00
  }, 'Budget Update');

  // Test circuit breaker reset
  await testEndpoint(app, 'POST', '/api/llm/metrics/reset-circuit-breakers', {
    modelId: 'gpt-4o-mini'
  }, 'Circuit Breaker Reset');

  console.log('\n📊 TESTING DATA STRUCTURES');
  console.log('-'.repeat(30));

  // Test comprehensive data structure
  try {
    const response = await request(app)
      .get('/api/llm/metrics/sample')
      .expect(200);

    const data = response.body.data;
    console.log('\n✅ Sample Dashboard Data Structure:');
    console.log(`   Summary fields: ${Object.keys(data.summary).join(', ')}`);
    console.log(`   Performance data: ${data.performance ? 'Available' : 'Missing'}`);
    console.log(`   Cost data: ${data.costs ? 'Available' : 'Missing'}`);
    console.log(`   Routing data: ${data.routing ? 'Available' : 'Missing'}`);
    console.log(`   Charts: ${Object.keys(data.charts).join(', ')}`);
    console.log(`   Alerts count: ${data.alerts.length}`);

    // Validate chart data structures
    if (data.charts.responseTime && data.charts.responseTime.length > 0) {
      const chartPoint = data.charts.responseTime[0];
      console.log(`   Response time chart fields: ${Object.keys(chartPoint).join(', ')}`);
    }

  } catch (error) {
    console.log(`❌ Data structure test failed: ${error.message}`);
  }

  console.log('\n🚨 TESTING ERROR HANDLING');
  console.log('-'.repeat(30));

  // Test invalid endpoints
  await testEndpoint(app, 'GET', '/api/llm/metrics/nonexistent', null, 'Invalid Endpoint', true);

  // Test invalid data
  await testEndpoint(app, 'PUT', '/api/llm/metrics/budget', {
    invalidField: 'invalid'
  }, 'Invalid Budget Data');

  console.log('\n📱 FRONTEND INTEGRATION EXAMPLES');
  console.log('-'.repeat(30));

  // Show examples of how frontend would use the API
  console.log('\n💡 Frontend Integration Examples:');
  console.log(`
  // Fetch dashboard data
  const dashboard = await fetch('/api/llm/metrics?format=dashboard');
  const data = await dashboard.json();
  
  // Get performance metrics for specific models
  const performance = await fetch('/api/llm/metrics/performance?models=gpt-4o-mini,claude-sonnet-4-20250514');
  
  // Update budget limits
  await fetch('/api/llm/metrics/budget', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dailyBudget: 50.00 })
  });
  
  // Export metrics data
  const exportData = await fetch('/api/llm/metrics/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'csv', timeRange: 86400000 })
  });
  `);

  console.log('\n🏆 API ENDPOINT TESTING COMPLETED!');
  console.log('\n💡 AVAILABLE ENDPOINTS:');
  console.log('   GET  /api/llm/metrics                    - Comprehensive metrics');
  console.log('   GET  /api/llm/metrics/performance        - Performance data');
  console.log('   GET  /api/llm/metrics/costs              - Cost analytics');
  console.log('   GET  /api/llm/metrics/health             - Service health');
  console.log('   GET  /api/llm/metrics/alerts             - System alerts');
  console.log('   POST /api/llm/metrics/export             - Export data');
  console.log('   PUT  /api/llm/metrics/budget             - Update budgets');
  console.log('   POST /api/llm/metrics/reset-circuit-breakers - Reset circuit breakers');
  console.log('   GET  /api/llm/metrics/sample             - Sample data for development');
}

/**
 * Test a specific API endpoint
 */
async function testEndpoint(app, method, path, data, description, expectError = false) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   ${method} ${path}`);

    let response;
    
    switch (method) {
      case 'GET':
        response = await request(app).get(path);
        break;
      case 'POST':
        response = await request(app).post(path).send(data);
        break;
      case 'PUT':
        response = await request(app).put(path).send(data);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    if (expectError) {
      if (response.status >= 400) {
        console.log(`   ✅ Expected error: ${response.status}`);
      } else {
        console.log(`   ⚠️  Expected error but got: ${response.status}`);
      }
    } else {
      if (response.status === 200) {
        console.log(`   ✅ Success: ${response.status}`);
        
        if (response.body.success !== undefined) {
          console.log(`   📊 Response success: ${response.body.success}`);
        }
        
        if (response.body.data) {
          const dataType = Array.isArray(response.body.data) ? 'array' : typeof response.body.data;
          console.log(`   📦 Data type: ${dataType}`);
          
          if (typeof response.body.data === 'object' && !Array.isArray(response.body.data)) {
            const fieldCount = Object.keys(response.body.data).length;
            console.log(`   🔢 Data fields: ${fieldCount}`);
          }
        }
      } else {
        console.log(`   ❌ Failed: ${response.status}`);
        if (response.body.error) {
          console.log(`   📝 Error: ${response.body.error}`);
        }
      }
    }

  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }
}

/**
 * Test rate limiting and concurrent requests
 */
async function testConcurrentRequests() {
  console.log('\n🔄 TESTING CONCURRENT REQUESTS');
  console.log('-'.repeat(30));

  const app = express();
  app.use(express.json());
  app.use('/api/llm', apiRoutes);

  const concurrentRequests = 5;
  const requests = [];

  console.log(`\n🚀 Making ${concurrentRequests} concurrent requests...`);

  for (let i = 0; i < concurrentRequests; i++) {
    requests.push(
      request(app)
        .get('/api/llm/metrics/sample')
        .then(response => ({
          index: i,
          status: response.status,
          success: response.body.success
        }))
        .catch(error => ({
          index: i,
          status: 'error',
          error: error.message
        }))
    );
  }

  try {
    const results = await Promise.all(requests);
    
    console.log('\n📊 Concurrent Request Results:');
    results.forEach(result => {
      console.log(`   Request ${result.index + 1}: ${result.status} ${result.success ? '✅' : '❌'}`);
    });

    const successCount = results.filter(r => r.status === 200).length;
    console.log(`\n✅ Success rate: ${successCount}/${concurrentRequests} (${(successCount/concurrentRequests*100).toFixed(1)}%)`);

  } catch (error) {
    console.log(`❌ Concurrent request test failed: ${error.message}`);
  }
}

/**
 * Test parameter validation
 */
async function testParameterValidation() {
  console.log('\n🔍 TESTING PARAMETER VALIDATION');
  console.log('-'.repeat(30));

  const app = express();
  app.use(express.json());
  app.use('/api/llm', apiRoutes);

  const validationTests = [
    {
      name: 'Valid time range',
      endpoint: '/api/llm/metrics?timeRange=24h',
      expectSuccess: true
    },
    {
      name: 'Invalid time range format',
      endpoint: '/api/llm/metrics?timeRange=invalid',
      expectSuccess: true // Should default to 24h
    },
    {
      name: 'Valid dashboard format',
      endpoint: '/api/llm/metrics?format=dashboard',
      expectSuccess: true
    },
    {
      name: 'Valid model list',
      endpoint: '/api/llm/metrics/performance?models=gpt-4o-mini,claude-sonnet-4-20250514',
      expectSuccess: true
    }
  ];

  for (const test of validationTests) {
    console.log(`\n🧪 ${test.name}:`);
    console.log(`   GET ${test.endpoint}`);

    try {
      const response = await request(app).get(test.endpoint);
      
      if (test.expectSuccess && response.status === 200) {
        console.log(`   ✅ Passed: ${response.status}`);
      } else if (!test.expectSuccess && response.status >= 400) {
        console.log(`   ✅ Correctly rejected: ${response.status}`);
      } else {
        console.log(`   ⚠️  Unexpected result: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testAPIEndpoints();
    await testConcurrentRequests();
    await testParameterValidation();
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Check if supertest is available
try {
  // If supertest is not installed, show installation instructions
  await import('supertest');
  runAllTests();
} catch (error) {
  console.log('\n⚠️  Note: supertest not available for API testing');
  console.log('To run full API tests, install supertest: npm install --save-dev supertest');
  console.log('\nShowing API endpoint documentation instead...');
  
  console.log('\n📋 API ENDPOINTS DOCUMENTATION');
  console.log('=' .repeat(50));
  
  const endpoints = [
    {
      method: 'GET',
      path: '/api/llm/metrics',
      description: 'Get comprehensive metrics data',
      parameters: 'timeRange (24h|7d|30d), format (json|dashboard)'
    },
    {
      method: 'GET', 
      path: '/api/llm/metrics/performance',
      description: 'Get performance metrics',
      parameters: 'models (comma-separated model IDs)'
    },
    {
      method: 'GET',
      path: '/api/llm/metrics/costs',
      description: 'Get cost analytics and budget status',
      parameters: 'None'
    },
    {
      method: 'GET',
      path: '/api/llm/metrics/health',
      description: 'Get service health status',
      parameters: 'None'
    },
    {
      method: 'GET',
      path: '/api/llm/metrics/alerts',
      description: 'Get current system alerts',
      parameters: 'None'
    },
    {
      method: 'POST',
      path: '/api/llm/metrics/export',
      description: 'Export metrics data',
      parameters: 'format (json|csv), timeRange (ms), includeRawData (boolean)'
    },
    {
      method: 'PUT',
      path: '/api/llm/metrics/budget',
      description: 'Update budget limits',
      parameters: 'dailyBudget (number), monthlyBudget (number)'
    },
    {
      method: 'POST',
      path: '/api/llm/metrics/reset-circuit-breakers',
      description: 'Reset circuit breakers',
      parameters: 'modelId (optional, resets all if not provided)'
    }
  ];
  
  endpoints.forEach(endpoint => {
    console.log(`\n${endpoint.method} ${endpoint.path}`);
    console.log(`   Description: ${endpoint.description}`);
    console.log(`   Parameters: ${endpoint.parameters}`);
  });
}