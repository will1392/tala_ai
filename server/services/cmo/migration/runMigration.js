#!/usr/bin/env node

/**
 * CMO Migration Script
 * 
 * Run this script to migrate from V1 to V2 architecture
 * Usage: node runMigration.js [command] [options]
 */

import cmoMigration from './CMOMigration.js';
import { CMOCompatibilityWrapper } from './CMOCompatibilityWrapper.js';

// Command line colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

/**
 * Test basic functionality
 */
async function testBasicFunctionality() {
  log.section('Testing Basic Functionality');
  
  try {
    await cmoMigration.initialize();
    log.success('Migration system initialized');
    
    // Test queries
    const testQueries = [
      'How do I create a direct mail campaign?',
      'What is the ROI of postcards?',
      'Best marketing strategies for travel agents',
      'Design tips for travel brochures'
    ];
    
    for (const query of testQueries) {
      log.info(`Testing: "${query}"`);
      
      try {
        const response = await cmoMigration.processMessage(
          query,
          'test-user',
          { expectLegacyFormat: true }
        );
        
        if (response && response.content) {
          log.success(`Response received (${response.content.length} chars)`);
        } else {
          log.error('Invalid response structure');
        }
      } catch (error) {
        log.error(`Query failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    log.error(`Basic functionality test failed: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * Compare V1 and V2 responses
 */
async function compareVersions() {
  log.section('Comparing V1 and V2 Responses');
  
  await cmoMigration.initialize();
  cmoMigration.setMode('dual');
  
  const testCases = [
    {
      query: 'I need help with direct mail for my travel agency',
      expectedChannel: 'direct_mail'
    },
    {
      query: 'What are the costs of postcard marketing?',
      expectedChannel: 'direct_mail'
    },
    {
      query: 'How can I improve my marketing?',
      expectedChannel: 'general'
    }
  ];
  
  for (const testCase of testCases) {
    log.info(`\nTesting: "${testCase.query}"`);
    
    try {
      const response = await cmoMigration.processMessage(
        testCase.query,
        'test-user',
        { expectLegacyFormat: true }
      );
      
      const metrics = cmoMigration.getMetrics();
      log.info(`Dual mode execution complete`);
      
      // The comparison is logged internally by dual mode
      
    } catch (error) {
      log.error(`Comparison failed: ${error.message}`);
    }
  }
}

/**
 * Validate V2 implementation
 */
async function validateV2() {
  log.section('Validating V2 Implementation');
  
  const validation = await cmoMigration.validateV2();
  
  if (validation.valid) {
    log.success('V2 validation passed!');
  } else {
    log.error('V2 validation failed');
  }
  
  validation.results.forEach(result => {
    if (result.passed && result.channelMatch) {
      log.success(`${result.test}: Passed (channel: ${result.channel})`);
    } else if (result.passed) {
      log.warn(`${result.test}: Partial pass (expected ${result.expectedChannel}, got ${result.channel})`);
    } else {
      log.error(`${result.test}: Failed - ${result.error || 'No response'}`);
    }
  });
  
  return validation.valid;
}

/**
 * Test compatibility wrapper
 */
async function testCompatibility() {
  log.section('Testing Compatibility Wrapper');
  
  const wrapper = new CMOCompatibilityWrapper();
  
  try {
    await wrapper.initialize();
    log.success('Wrapper initialized');
    
    // Test V1 method
    log.info('Testing processQuery (V1 method)...');
    const v1Response = await wrapper.processQuery('Help with direct mail postcards', {
      userId: 'test-user',
      category: 'direct_mail'
    });
    
    if (v1Response && v1Response.content) {
      log.success('V1 method works');
    } else {
      log.error('V1 method failed');
    }
    
    // Test V2 method
    log.info('Testing processMessage (V2 method)...');
    const v2Response = await wrapper.processMessage(
      'Help with direct mail postcards',
      'test-user',
      { category: 'direct_mail' }
    );
    
    if (v2Response && v2Response.content) {
      log.success('V2 method works');
    } else {
      log.error('V2 method failed');
    }
    
  } catch (error) {
    log.error(`Compatibility test failed: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * Run performance comparison
 */
async function performanceTest() {
  log.section('Performance Comparison');
  
  await cmoMigration.initialize();
  
  const iterations = 10;
  const query = 'I need help creating a direct mail campaign for cruise packages';
  
  // Test V1 performance
  log.info(`Testing V1 performance (${iterations} iterations)...`);
  cmoMigration.setMode('v1');
  
  const v1Start = Date.now();
  for (let i = 0; i < iterations; i++) {
    await cmoMigration.processMessage(query, 'perf-test', {});
  }
  const v1Time = Date.now() - v1Start;
  const v1Avg = v1Time / iterations;
  
  // Test V2 performance
  log.info(`Testing V2 performance (${iterations} iterations)...`);
  cmoMigration.setMode('v2');
  
  const v2Start = Date.now();
  for (let i = 0; i < iterations; i++) {
    await cmoMigration.processMessage(query, 'perf-test', {});
  }
  const v2Time = Date.now() - v2Start;
  const v2Avg = v2Time / iterations;
  
  // Results
  log.success(`V1 Average: ${v1Avg.toFixed(2)}ms`);
  log.success(`V2 Average: ${v2Avg.toFixed(2)}ms`);
  
  const improvement = ((v1Avg - v2Avg) / v1Avg * 100).toFixed(1);
  if (v2Avg < v1Avg) {
    log.success(`V2 is ${Math.abs(improvement)}% faster! 🚀`);
  } else {
    log.warn(`V2 is ${Math.abs(improvement)}% slower`);
  }
}

/**
 * Show migration metrics
 */
async function showMetrics() {
  log.section('Migration Metrics');
  
  const metrics = cmoMigration.getMetrics();
  
  console.log('Current Metrics:');
  console.log(`  Mode: ${metrics.mode}`);
  console.log(`  V1 Calls: ${metrics.v1Calls} (${metrics.v1Percentage?.toFixed(1) || 0}%)`);
  console.log(`  V2 Calls: ${metrics.v2Calls} (${metrics.v2Percentage?.toFixed(1) || 0}%)`);
  console.log(`  Dual Calls: ${metrics.dualCalls}`);
  console.log(`  Errors: ${metrics.errors} (${metrics.errorRate?.toFixed(1) || 0}%)`);
  
  if (metrics.migrationStarted) {
    const duration = Date.now() - metrics.migrationStarted;
    console.log(`  Migration Duration: ${Math.floor(duration / 1000)}s`);
  }
}

/**
 * Set migration mode
 */
async function setMode(mode) {
  log.section(`Setting Mode to: ${mode}`);
  
  try {
    await cmoMigration.initialize();
    cmoMigration.setMode(mode);
    log.success(`Mode set to: ${mode}`);
    
    // Test with new mode
    const response = await cmoMigration.processMessage(
      'Test query for direct mail',
      'mode-test',
      {}
    );
    
    if (response) {
      log.success('Mode is working correctly');
    }
    
  } catch (error) {
    log.error(`Failed to set mode: ${error.message}`);
  }
}

/**
 * Main migration script
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  console.log('\n🔄 CMO Migration Tool\n');
  
  switch (command) {
    case 'test':
      await testBasicFunctionality();
      break;
      
    case 'compare':
      await compareVersions();
      break;
      
    case 'validate':
      await validateV2();
      break;
      
    case 'compatibility':
      await testCompatibility();
      break;
      
    case 'performance':
      await performanceTest();
      break;
      
    case 'metrics':
      await showMetrics();
      break;
      
    case 'mode':
      const mode = args[1];
      if (!mode) {
        log.error('Please specify a mode: v1, v2, dual, or migration');
      } else {
        await setMode(mode);
      }
      break;
      
    case 'all':
      // Run all tests
      const results = {
        basic: await testBasicFunctionality(),
        validation: await validateV2(),
        compatibility: await testCompatibility()
      };
      
      log.section('Summary');
      Object.entries(results).forEach(([test, passed]) => {
        if (passed) {
          log.success(`${test}: PASSED`);
        } else {
          log.error(`${test}: FAILED`);
        }
      });
      
      if (Object.values(results).every(r => r)) {
        log.success('\n✅ All tests passed! Safe to migrate.');
      } else {
        log.error('\n❌ Some tests failed. Please fix issues before migrating.');
      }
      break;
      
    case 'help':
    default:
      console.log('Usage: node runMigration.js [command] [options]\n');
      console.log('Commands:');
      console.log('  test          - Test basic functionality');
      console.log('  compare       - Compare V1 and V2 responses');
      console.log('  validate      - Validate V2 implementation');
      console.log('  compatibility - Test compatibility wrapper');
      console.log('  performance   - Run performance comparison');
      console.log('  metrics       - Show migration metrics');
      console.log('  mode [mode]   - Set migration mode (v1, v2, dual, migration)');
      console.log('  all           - Run all tests');
      console.log('  help          - Show this help message');
      break;
  }
  
  console.log('\n');
}

// Run the script
main().catch(error => {
  log.error(`Script failed: ${error.message}`);
  process.exit(1);
});