/**
 * Comprehensive Credit System Test
 * Tests all credit system endpoints and functionality
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'https://talaai-production.up.railway.app';
const USER_ID = '59b70373-ba68-4d89-8420-5c3723aef01f';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEndpoint(name, method, path, body = null) {
  const url = `${API_URL}${path}`;
  const options = {
    method,
    headers: {
      'x-user-id': USER_ID,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    log(colors.cyan, `\n🧪 Testing: ${name}`);
    log(colors.blue, `   ${method} ${path}`);
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      log(colors.green, `   ✅ Success (${response.status})`);
      return { success: true, data, status: response.status };
    } else {
      log(colors.red, `   ❌ Failed (${response.status})`);
      console.log('   Response:', JSON.stringify(data, null, 2));
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    log(colors.red, `   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log(colors.yellow, '\n╔════════════════════════════════════════╗');
  log(colors.yellow, '║   TALA AI CREDIT SYSTEM TEST SUITE    ║');
  log(colors.yellow, '╚════════════════════════════════════════╝');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Get Credit Balance
  let balanceResult = await testEndpoint(
    'Get Credit Balance',
    'GET',
    '/api/credits/balance'
  );
  results.total++;
  if (balanceResult.success) {
    results.passed++;
    log(colors.green, `   Available Credits: ${balanceResult.data.data.available_credits}`);
    log(colors.green, `   Plan Type: ${balanceResult.data.data.plan_type}`);
  } else {
    results.failed++;
  }

  // Test 2: Get Credit Status (for frontend)
  let statusResult = await testEndpoint(
    'Get Credit Status',
    'GET',
    '/api/credits/status'
  );
  results.total++;
  if (statusResult.success) {
    results.passed++;
    log(colors.green, `   Balance: ${statusResult.data.credits.balance}`);
    log(colors.green, `   Monthly Allocation: ${statusResult.data.credits.monthly_allocation}`);
    log(colors.green, `   Tier: ${statusResult.data.credits.tier}`);
  } else {
    results.failed++;
  }

  // Test 3: Check Credits for Operation
  let checkResult = await testEndpoint(
    'Check Credits for Chat',
    'POST',
    '/api/credits/check',
    {
      operation: 'chat_message',
      params: { model: 'gpt-4o-mini' }
    }
  );
  results.total++;
  if (checkResult.success && checkResult.data.hasEnoughCredits) {
    results.passed++;
    log(colors.green, `   Has Enough Credits: ${checkResult.data.hasEnoughCredits}`);
    log(colors.green, `   Cost: ${checkResult.data.creditCost} credits`);
  } else {
    results.failed++;
  }

  // Test 4: Consume Credits
  const initialBalance = balanceResult.data.data.available_credits;
  let consumeResult = await testEndpoint(
    'Consume Credits',
    'POST',
    '/api/credits/consume',
    {
      operation: 'chat_message',
      params: { cost: 1, model: 'gpt-4o-mini' }
    }
  );
  results.total++;
  if (consumeResult.success) {
    results.passed++;
    log(colors.green, `   Credits Consumed: ${consumeResult.data.creditsConsumed}`);
    log(colors.green, `   Remaining: ${consumeResult.data.remainingCredits}`);
  } else {
    results.failed++;
  }

  // Test 5: Verify Balance Decreased
  balanceResult = await testEndpoint(
    'Verify Balance After Consumption',
    'GET',
    '/api/credits/balance'
  );
  results.total++;
  const newBalance = balanceResult.data.data.available_credits;
  if (balanceResult.success && newBalance === initialBalance - 1) {
    results.passed++;
    log(colors.green, `   Balance decreased correctly: ${initialBalance} → ${newBalance}`);
  } else {
    results.failed++;
    log(colors.red, `   Balance mismatch: expected ${initialBalance - 1}, got ${newBalance}`);
  }

  // Test 6: Get Transaction History
  let historyResult = await testEndpoint(
    'Get Transaction History',
    'GET',
    '/api/credits/history?days=1'
  );
  results.total++;
  if (historyResult.success) {
    results.passed++;
    log(colors.green, `   Transactions: ${historyResult.data.transactions.length}`);
    log(colors.green, `   Total Spent: ${historyResult.data.totalSpent} credits`);
  } else {
    results.failed++;
  }

  // Test 7: Get Credit Packages
  let packagesResult = await testEndpoint(
    'Get Credit Packages',
    'GET',
    '/api/credits/packages'
  );
  results.total++;
  if (packagesResult.success) {
    results.passed++;
    log(colors.green, `   Available Packages: ${packagesResult.data.packages.length}`);
  } else {
    results.failed++;
  }

  // Test 8: Test Insufficient Credits
  let insufficientResult = await testEndpoint(
    'Check Insufficient Credits',
    'POST',
    '/api/credits/check',
    {
      operation: 'chat_message',
      params: { cost: 999999 }
    }
  );
  results.total++;
  if (insufficientResult.success && !insufficientResult.data.hasEnoughCredits) {
    results.passed++;
    log(colors.green, `   Correctly detected insufficient credits`);
    log(colors.green, `   Shortfall: ${insufficientResult.data.shortfall} credits`);
  } else {
    results.failed++;
  }

  // Test 9: Get Available Plans
  let plansResult = await testEndpoint(
    'Get Available Plans',
    'GET',
    '/api/credits/plans'
  );
  results.total++;
  if (plansResult.success) {
    results.passed++;
    log(colors.green, `   Available Plans: ${plansResult.data.plans.length}`);
  } else {
    results.failed++;
  }

  // Print Summary
  log(colors.yellow, '\n╔════════════════════════════════════════╗');
  log(colors.yellow, '║           TEST RESULTS SUMMARY         ║');
  log(colors.yellow, '╚════════════════════════════════════════╝');
  
  log(colors.cyan, `\n📊 Total Tests: ${results.total}`);
  log(colors.green, `✅ Passed: ${results.passed}`);
  log(colors.red, `❌ Failed: ${results.failed}`);
  
  const percentage = ((results.passed / results.total) * 100).toFixed(1);
  log(colors.cyan, `📈 Success Rate: ${percentage}%`);
  
  if (results.failed === 0) {
    log(colors.green, '\n🎉 All tests passed! Credit system is fully functional.');
  } else {
    log(colors.red, `\n⚠️  ${results.failed} test(s) failed. Please review the errors above.`);
  }
  
  log(colors.yellow, '\n════════════════════════════════════════\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(colors.red, `\n❌ Test suite failed: ${error.message}`);
  process.exit(1);
});
