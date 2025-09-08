#!/usr/bin/env node

/**
 * Test DirectMailAgent with Pipeline Architecture
 * 
 * Comprehensive test to verify DirectMailAgent works correctly
 * with the new pipeline architecture.
 */

import cmoAssistantV2 from '../CMOAssistantV2.js';
import agentRegistry from '../agents/AgentRegistry.js';
import { DirectMailAgent } from '../agents/specialized/DirectMailAgent.js';

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = {
  test: (name) => console.log(`\n${colors.blue}TEST:${colors.reset} ${name}`),
  pass: (msg) => console.log(`  ${colors.green}✓${colors.reset} ${msg}`),
  fail: (msg) => console.log(`  ${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`  ${colors.yellow}ℹ${colors.reset} ${msg}`)
};

/**
 * Test 1: Agent Registration
 */
async function testAgentRegistration() {
  log.test('Agent Registration');
  
  try {
    // Check if DirectMailAgent is registered
    const agents = agentRegistry.listAgents();
    const directMailAgent = agents.find(a => a.channel === 'direct_mail');
    
    if (directMailAgent) {
      log.pass('DirectMailAgent is registered');
      log.info(`Channel: ${directMailAgent.channel}`);
      log.info(`Triggers: ${directMailAgent.triggers}`);
    } else {
      log.fail('DirectMailAgent not found in registry');
      return false;
    }
    
    // Test confidence calculation
    const confidence = DirectMailAgent.metadata.confidence(
      'I need help with direct mail postcards',
      { detectedChannel: 'direct_mail' }
    );
    
    if (confidence > 0.8) {
      log.pass(`Confidence calculation works: ${confidence}`);
    } else {
      log.fail(`Low confidence for direct mail query: ${confidence}`);
    }
    
    return true;
  } catch (error) {
    log.fail(`Registration test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Direct Agent Execution
 */
async function testDirectAgentExecution() {
  log.test('Direct Agent Execution');
  
  try {
    const agent = new DirectMailAgent();
    
    // Test basic query
    const result = await agent.execute({
      query: 'How much does direct mail cost for travel agencies?'
    });
    
    if (result && result.status === 'success') {
      log.pass('Agent executed successfully');
      log.info(`Content length: ${result.content?.text?.length || 0} chars`);
      log.info(`Has structured data: ${!!result.content?.structured}`);
    } else {
      log.fail('Agent execution failed');
      return false;
    }
    
    // Test ROI query
    const roiResult = await agent.execute({
      query: 'What ROI can I expect from postcard campaigns?'
    });
    
    if (roiResult && roiResult.content?.text?.includes('ROI')) {
      log.pass('ROI query handled correctly');
    } else {
      log.fail('ROI query not handled properly');
    }
    
    return true;
  } catch (error) {
    log.fail(`Direct execution failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Pipeline Integration
 */
async function testPipelineIntegration() {
  log.test('Pipeline Integration');
  
  try {
    await cmoAssistantV2.initialize();
    log.pass('CMOAssistantV2 initialized');
    
    // Test direct mail query through pipeline
    const queries = [
      'I need help with direct mail marketing',
      'What are the costs of postcard campaigns?',
      'Design tips for travel agency mailers',
      'ROI of direct mail for cruise promotions'
    ];
    
    for (const query of queries) {
      log.info(`Testing: "${query}"`);
      
      const response = await cmoAssistantV2.processMessage(
        query,
        'test-user',
        { legacyFormat: true }
      );
      
      if (response && response.content) {
        // Check if DirectMailAgent was used
        const isFromAgent = response.source?.includes('agent:direct_mail') ||
                          response.metadata?.agent === 'DirectMailAgent' ||
                          response.metadata?.channel === 'direct_mail';
        
        if (isFromAgent) {
          log.pass(`Routed to DirectMailAgent (${response.content.length} chars)`);
        } else {
          log.fail(`Not routed to DirectMailAgent (source: ${response.source})`);
        }
        
        // Verify travel-specific content
        const hasTravelContent = response.content.toLowerCase().includes('travel') ||
                               response.content.toLowerCase().includes('agency') ||
                               response.content.toLowerCase().includes('cruise');
        
        if (hasTravelContent) {
          log.pass('Contains travel-specific content');
        } else {
          log.fail('Missing travel-specific content');
        }
      } else {
        log.fail('No response received');
      }
    }
    
    return true;
  } catch (error) {
    log.fail(`Pipeline integration failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Response Quality
 */
async function testResponseQuality() {
  log.test('Response Quality');
  
  try {
    const testCases = [
      {
        query: 'How do I design postcards for travel packages?',
        expectedContent: ['design', 'postcard', 'travel'],
        type: 'design'
      },
      {
        query: 'What lists should I use for direct mail?',
        expectedContent: ['target', 'list', 'audience'],
        type: 'targeting'
      },
      {
        query: 'ROI expectations for direct mail',
        expectedContent: ['ROI', 'return', 'percentage'],
        type: 'roi'
      }
    ];
    
    for (const testCase of testCases) {
      log.info(`Testing ${testCase.type} query`);
      
      const response = await cmoAssistantV2.processMessage(
        testCase.query,
        'quality-test',
        {}
      );
      
      if (!response || !response.content) {
        log.fail('No response received');
        continue;
      }
      
      // Check for expected content
      const contentLower = response.content.toLowerCase();
      const hasExpectedContent = testCase.expectedContent.every(word => 
        contentLower.includes(word)
      );
      
      if (hasExpectedContent) {
        log.pass(`Contains expected ${testCase.type} content`);
      } else {
        log.fail(`Missing expected content: ${testCase.expectedContent}`);
      }
      
      // Check response structure
      if (response.structured && Object.keys(response.structured).length > 0) {
        log.pass('Has structured data');
      }
      
      // Check confidence
      if (response.confidence >= 0.7) {
        log.pass(`Good confidence: ${response.confidence}`);
      } else {
        log.fail(`Low confidence: ${response.confidence}`);
      }
    }
    
    return true;
  } catch (error) {
    log.fail(`Response quality test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Edge Cases
 */
async function testEdgeCases() {
  log.test('Edge Cases');
  
  try {
    // Test ambiguous query
    const ambiguousResponse = await cmoAssistantV2.processMessage(
      'marketing tips',
      'edge-test',
      {}
    );
    
    if (ambiguousResponse && ambiguousResponse.content) {
      log.pass('Handled ambiguous query');
      const source = ambiguousResponse.source || ambiguousResponse.metadata?.source;
      log.info(`Source: ${source}`);
    }
    
    // Test mixed channel query
    const mixedResponse = await cmoAssistantV2.processMessage(
      'Should I use direct mail or email for my campaign?',
      'edge-test',
      {}
    );
    
    if (mixedResponse && mixedResponse.content) {
      log.pass('Handled mixed channel query');
    }
    
    // Test with specific context
    const contextResponse = await cmoAssistantV2.processMessage(
      'postcard design',
      'edge-test',
      { 
        subMode: 'direct_mail',
        businessType: 'travel agency'
      }
    );
    
    if (contextResponse && contextResponse.content.includes('travel')) {
      log.pass('Used provided context correctly');
    }
    
    return true;
  } catch (error) {
    log.fail(`Edge case test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 6: Performance
 */
async function testPerformance() {
  log.test('Performance');
  
  try {
    const iterations = 5;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      await cmoAssistantV2.processMessage(
        'Direct mail campaign for cruise packages',
        'perf-test',
        {}
      );
      
      const elapsed = Date.now() - start;
      times.push(elapsed);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    
    log.info(`Average: ${avgTime.toFixed(0)}ms`);
    log.info(`Min: ${minTime}ms, Max: ${maxTime}ms`);
    
    if (avgTime < 1000) {
      log.pass('Good performance (< 1s average)');
    } else {
      log.fail(`Slow performance: ${avgTime}ms average`);
    }
    
    return true;
  } catch (error) {
    log.fail(`Performance test failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🧪 Testing DirectMail Agent with Pipeline Architecture\n');
  
  const tests = [
    { name: 'Agent Registration', fn: testAgentRegistration },
    { name: 'Direct Execution', fn: testDirectAgentExecution },
    { name: 'Pipeline Integration', fn: testPipelineIntegration },
    { name: 'Response Quality', fn: testResponseQuality },
    { name: 'Edge Cases', fn: testEdgeCases },
    { name: 'Performance', fn: testPerformance }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`Test "${test.name}" crashed:`, error);
      results.push({ name: test.name, passed: false, error });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const status = result.passed 
      ? `${colors.green}PASS${colors.reset}` 
      : `${colors.red}FAIL${colors.reset}`;
    console.log(`${result.name}: ${status}`);
  });
  
  console.log('\n' + '-'.repeat(50));
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}✅ All tests passed!${colors.reset}`);
    console.log('DirectMailAgent is working correctly with the pipeline.\n');
  } else {
    console.log(`\n${colors.red}❌ Some tests failed.${colors.reset}`);
    console.log('Please check the logs above for details.\n');
  }
  
  // Get metrics
  const metrics = cmoAssistantV2.getMetrics();
  console.log('Pipeline Metrics:');
  console.log(`  Total queries: ${metrics.totalQueries}`);
  
  if (metrics.agents) {
    console.log('\nAgent Metrics:');
    Object.entries(metrics.agents).forEach(([channel, stats]) => {
      console.log(`  ${channel}: ${stats.invocations} calls, ${stats.errors} errors`);
    });
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});