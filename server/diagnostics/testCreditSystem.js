#!/usr/bin/env node
/**
 * Credit System Diagnostic Script
 * Tests all aspects of the credit system to identify issues
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import CreditSystem from '../services/creditSystem.js';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

// Test user ID (you can change this to test with a real user)
const TEST_USER_ID = process.argv[2] || 'test_user_123';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logTest(test, success, details = '') {
  const status = success ? `✅ PASS` : `❌ FAIL`;
  const color = success ? 'green' : 'red';
  log(`${status} - ${test}`, color);
  if (details) {
    console.log(`     ${details}`);
  }
}

async function testSupabaseConnection() {
  logSection('1. Testing Supabase Connection');
  
  try {
    // Check environment variables
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_KEY;
    
    logTest('SUPABASE_URL configured', hasUrl, 
      hasUrl ? process.env.SUPABASE_URL : 'Missing SUPABASE_URL');
    
    logTest('SUPABASE_SERVICE_KEY configured', hasServiceKey,
      hasServiceKey ? 'Service key present' : 'Missing SUPABASE_SERVICE_KEY');
    
    if (!hasUrl || !hasServiceKey) {
      return false;
    }
    
    // Test connection
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error && error.message?.includes('relation') && error.message?.includes('does not exist')) {
      logTest('Database connection', true, 'Connected successfully');
      logTest('Users table exists', false, 'Table does not exist - needs migration');
      return true; // Connection works, but tables need to be created
    }
    
    logTest('Database connection', !error, error?.message || 'Connected successfully');
    logTest('Users table exists', !error, error ? 'Table might not exist' : 'Table exists');
    
    return !error;
  } catch (error) {
    logTest('Supabase connection', false, error.message);
    return false;
  }
}

async function testCreditTables() {
  logSection('2. Testing Credit System Tables');
  
  const creditSystem = new CreditSystem();
  const tables = [
    'user_credits',
    'organization_credits',
    'credit_transactions',
    'agency_members',
    'plan_pricing'
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await creditSystem.supabase
        .from(table)
        .select('*')
        .limit(1);
      
      const exists = !error || !error.message?.includes('does not exist');
      logTest(`Table '${table}'`, exists, 
        exists ? 'Table exists' : 'Table does not exist');
      
      if (!exists) allTablesExist = false;
    } catch (error) {
      logTest(`Table '${table}'`, false, error.message);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testGetUserCredits(userId) {
  logSection('3. Testing getUserCredits Function');
  
  const creditSystem = new CreditSystem();
  
  try {
    const result = await creditSystem.getUserCredits(userId);
    
    logTest('getUserCredits execution', result.success, 
      result.success ? 'Function executed successfully' : result.error);
    
    if (result.success) {
      log('\nCredit Details:', 'cyan');
      console.log(`  User ID: ${result.data.user_id || userId}`);
      console.log(`  Total Credits: ${result.data.total_credits}`);
      console.log(`  Used Credits: ${result.data.used_credits}`);
      console.log(`  Bonus Credits: ${result.data.bonus_credits}`);
      console.log(`  Available Credits: ${result.data.available_credits}`);
      console.log(`  Percentage Used: ${result.data.percentage_used}%`);
      console.log(`  Plan Type: ${result.data.plan_type}`);
      console.log(`  Is Organization Pool: ${result.data.is_organization_pool}`);
    }
    
    return result.success;
  } catch (error) {
    logTest('getUserCredits execution', false, error.message);
    return false;
  }
}

async function testCreditConsumption(userId) {
  logSection('4. Testing Credit Consumption');
  
  const creditSystem = new CreditSystem();
  
  try {
    // First check current credits
    const beforeResult = await creditSystem.getUserCredits(userId);
    if (!beforeResult.success) {
      logTest('Get credits before consumption', false, beforeResult.error);
      return false;
    }
    
    const creditsBefore = beforeResult.data.available_credits;
    log(`\nCredits before: ${creditsBefore}`, 'blue');
    
    // Test credit check
    const checkResult = await creditSystem.checkCredits(userId, 'chat_message', { model: 'gpt-4o-mini' });
    logTest('checkCredits function', checkResult.success, 
      checkResult.success ? `Cost would be ${checkResult.creditCost} credits` : checkResult.error);
    
    // Test credit consumption
    const consumeResult = await creditSystem.consumeCredits(userId, 'chat_message', { model: 'gpt-4o-mini' });
    logTest('consumeCredits function', consumeResult.success,
      consumeResult.success ? `Consumed ${consumeResult.creditsConsumed} credits` : consumeResult.error);
    
    if (consumeResult.success) {
      // Check credits after consumption
      const afterResult = await creditSystem.getUserCredits(userId);
      const creditsAfter = afterResult.data.available_credits;
      
      log(`Credits after: ${creditsAfter}`, 'blue');
      log(`Credits consumed: ${creditsBefore - creditsAfter}`, 'yellow');
      
      logTest('Credit deduction verified', 
        creditsBefore > creditsAfter && (creditsBefore - creditsAfter) === consumeResult.creditsConsumed,
        `Expected ${consumeResult.creditsConsumed} credits to be deducted`);
    }
    
    return consumeResult.success;
  } catch (error) {
    logTest('Credit consumption', false, error.message);
    return false;
  }
}

async function testCreditHistory(userId) {
  logSection('5. Testing Credit History');
  
  const creditSystem = new CreditSystem();
  
  try {
    const result = await creditSystem.getCreditHistory(userId, 7);
    
    logTest('getCreditHistory function', result.success,
      result.success ? `Found ${result.transactions?.length || 0} transactions` : result.error);
    
    if (result.success && result.transactions?.length > 0) {
      log('\nRecent Transactions:', 'cyan');
      result.transactions.slice(0, 5).forEach(tx => {
        console.log(`  ${tx.operation}: ${tx.credits} credits at ${tx.created_at}`);
      });
    }
    
    return result.success;
  } catch (error) {
    logTest('Credit history', false, error.message);
    return false;
  }
}

async function testMiddleware() {
  logSection('6. Testing Credit Middleware Integration');
  
  try {
    // Import middleware
    const { requireCredits } = await import('../middleware/creditsMiddleware.js');
    
    // Create mock request/response objects
    const mockReq = {
      headers: { 'x-user-id': TEST_USER_ID },
      body: { message: 'test', model: 'gpt-4o-mini' },
      path: '/api/chat',
      method: 'POST'
    };
    
    const mockRes = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this._jsonData = data;
        return this;
      },
      send: function(data) {
        this._sendData = data;
        return this;
      }
    };
    
    let middlewareError = null;
    let nextCalled = false;
    
    const middleware = requireCredits('chat_ai');
    
    // Test middleware
    await new Promise((resolve) => {
      middleware(mockReq, mockRes, (err) => {
        middlewareError = err;
        nextCalled = true;
        resolve();
      });
    });
    
    logTest('Middleware execution', !middlewareError && nextCalled,
      middlewareError ? middlewareError.message : 'Middleware passed request through');
    
    // Check if credit info was attached
    logTest('Credit info attached to request', !!mockReq.creditInfo,
      mockReq.creditInfo ? `Operation: ${mockReq.creditInfo.operation}, Cost: ${mockReq.creditInfo.cost}` : 'No credit info');
    
    return !middlewareError && nextCalled;
  } catch (error) {
    logTest('Middleware test', false, error.message);
    return false;
  }
}

async function runDiagnostics() {
  log('\n🔧 CREDIT SYSTEM DIAGNOSTICS', 'bright');
  log(`Testing with user ID: ${TEST_USER_ID}\n`, 'yellow');
  
  const results = {
    connection: await testSupabaseConnection(),
    tables: await testCreditTables(),
    getUserCredits: await testGetUserCredits(TEST_USER_ID),
    consumption: await testCreditConsumption(TEST_USER_ID),
    history: await testCreditHistory(TEST_USER_ID),
    middleware: await testMiddleware()
  };
  
  logSection('SUMMARY');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  const allPassed = passedTests === totalTests;
  
  log(`\nTotal Tests: ${totalTests}`, 'bright');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${totalTests - passedTests}`, 'red');
  
  if (allPassed) {
    log('\n✅ All tests passed! Credit system is working correctly.', 'green');
  } else {
    log('\n❌ Some tests failed. Please check the errors above.', 'red');
    
    // Provide specific recommendations
    log('\nRecommendations:', 'yellow');
    
    if (!results.connection) {
      console.log('1. Check your Supabase environment variables in server/.env');
      console.log('   - SUPABASE_URL should be your Supabase project URL');
      console.log('   - SUPABASE_SERVICE_KEY should be your service role key');
    }
    
    if (results.connection && !results.tables) {
      console.log('1. Run the credit system migration to create necessary tables');
      console.log('   cd server && npm run migrate:credits');
    }
    
    if (results.tables && !results.getUserCredits) {
      console.log('1. Check if the user exists in the database');
      console.log('2. Verify the credit system initialization logic');
    }
    
    if (results.getUserCredits && !results.consumption) {
      console.log('1. Check if the user has enough credits');
      console.log('2. Verify the credit consumption logic and database updates');
    }
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run diagnostics
runDiagnostics().catch(error => {
  log('\n💥 Diagnostic script failed:', 'red');
  console.error(error);
  process.exit(1);
});