#!/usr/bin/env node

/**
 * Direct test of field assistance functionality
 * Tests the CMOAssistant.handleFieldAssistance method directly
 */

import { cmoAssistant } from './server/services/cmo/CMOAssistant.js';

const testCases = [
  {
    name: "Travel Specialty Field",
    message: "luxury travel - 5 star properties and private touring",
    fieldContext: {
      fieldLabel: "Travel Specialty",
      fieldType: "text",
      fieldDescription: "Your travel business specialty"
    }
  },
  {
    name: "Business Goals Field",
    message: "What should I write for my goals?",
    fieldContext: {
      fieldLabel: "What are your primary business goals for the next 6-12 months?",
      fieldType: "textarea",
      fieldDescription: "Your business objectives"
    }
  },
  {
    name: "Budget Field",
    message: "What should I put for budget?",
    fieldContext: {
      fieldLabel: "Budget",
      fieldType: "select",
      fieldOptions: ["$1,000 - $2,500", "$2,500 - $5,000", "$5,000 - $10,000", "$10,000+"]
    }
  }
];

async function testFieldAssistance(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📝 Message: "${testCase.message}"`);
  console.log(`📋 Field: ${testCase.fieldContext.fieldLabel}`);
  
  try {
    const response = await cmoAssistant.handleFieldAssistance(
      testCase.message,
      'test-user',
      {
        subMode: 'field_assistance',
        fieldContext: testCase.fieldContext
      }
    );
    
    console.log(`✅ Response received:`);
    console.log(`   Has response: ${!!response.response}`);
    console.log(`   Response length: ${response.response?.length || 0}`);
    
    if (response.response) {
      console.log(`\n📄 Response:`);
      console.log(response.response);
      console.log('\n---');
      
      // Check for quality
      if (response.response.trim() === '') {
        console.error('❌ ERROR: Empty response!');
        return false;
      }
      
      if (response.response === testCase.message) {
        console.error('❌ ERROR: Response echoes input!');
        return false;
      }
      
      if (response.response.includes('I suggest using:')) {
        console.log('✅ Response includes specific suggestion');
      }
      
      return true;
    } else {
      console.error('❌ ERROR: No response content!');
      return false;
    }
    
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Direct Field Assistance Tests...');
  console.log('=====================================\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    const success = await testFieldAssistance(testCase);
    results.push({ test: testCase.name, success });
  }
  
  console.log('\n=====================================');
  console.log('📊 Test Results:');
  console.log('=====================================');
  
  let passed = 0;
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.test}`);
    if (result.success) passed++;
  });
  
  console.log(`\nTotal: ${passed}/${results.length} passed`);
  
  if (passed === results.length) {
    console.log('\n🎉 All tests passed! Field assistance is working properly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);