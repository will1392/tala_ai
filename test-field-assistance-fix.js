#!/usr/bin/env node

/**
 * Test script to verify field assistance is working properly
 * Simulates the exact request format from the Direct Mail consultation
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

// Test cases for field assistance
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
    name: "Budget Field",
    message: "What should I put for budget?",
    fieldContext: {
      fieldLabel: "Budget",
      fieldType: "select",
      fieldOptions: ["$1,000 - $2,500", "$2,500 - $5,000", "$5,000 - $10,000", "$10,000+"]
    }
  },
  {
    name: "Offer Field",
    message: "Help me write my offer",
    fieldContext: {
      fieldLabel: "Your Offer",
      fieldType: "textarea",
      fieldDescription: "What special offer or promotion will you include?"
    }
  }
];

async function testFieldAssistance(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📝 Message: "${testCase.message}"`);
  console.log(`📋 Field: ${testCase.fieldContext.fieldLabel}`);
  
  try {
    const requestData = {
      message: testCase.message,
      mode: 'cmo',
      conversationId: `test-${Date.now()}`,
      context: {
        task: 'field_assistance',
        fieldId: testCase.fieldContext.fieldLabel.toLowerCase().replace(/\s+/g, '_'),
        fieldLabel: testCase.fieldContext.fieldLabel,
        fieldType: testCase.fieldContext.fieldType,
        fieldOptions: testCase.fieldContext.fieldOptions,
        fieldDescription: testCase.fieldContext.fieldDescription
      }
    };
    
    console.log('📤 Sending request:', JSON.stringify(requestData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/chat`, requestData);
    
    console.log(`✅ Response received:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Has content: ${!!response.data?.response}`);
    console.log(`   Content length: ${response.data?.response?.length || 0}`);
    
    if (response.data?.response) {
      console.log(`\n📄 Response preview:`);
      console.log(response.data.response.substring(0, 200) + '...\n');
      
      // Check for empty response
      if (response.data.response.trim() === '') {
        console.error('❌ ERROR: Empty response received!');
        return false;
      }
      
      // Check for echo response
      if (response.data.response === testCase.message) {
        console.error('❌ ERROR: Response is echoing the input!');
        return false;
      }
      
      return true;
    } else {
      console.error('❌ ERROR: No response content!');
      return false;
    }
    
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Field Assistance Tests...');
  console.log('=====================================\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    const success = await testFieldAssistance(testCase);
    results.push({ test: testCase.name, success });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
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
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Run the tests
runTests().catch(console.error);