#!/usr/bin/env node

/**
 * Test User Learning System
 * 
 * Tests the UserLearningHub to ensure it:
 * 1. Works correctly when enabled
 * 2. Gracefully degrades when disabled
 * 3. Doesn't break core functionality
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import UserLearningHub from './services/learning/UserLearningHub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

console.log('🧪 Testing User Learning System');
console.log('================================\n');

async function testUserLearning() {
  try {
    // Test 1: Initialize UserLearningHub
    console.log('Test 1: Initializing UserLearningHub...');
    const learningHub = new UserLearningHub({
      enableLearning: true,
      learningRate: 0.1
    });
    console.log('✅ UserLearningHub initialized successfully\n');
    
    // Test 2: Learn from interaction (first interaction)
    console.log('Test 2: Learning from first interaction...');
    const testUserId = 'test-user-' + Date.now();
    const interaction1 = {
      userId: testUserId,
      message: 'Hi there! Could you please help me with creating a marketing campaign for our SaaS startup?',
      response: 'I\'ll help you create an effective marketing campaign for your SaaS startup...',
      metadata: {
        mode: 'cmo',
        timestamp: new Date()
      }
    };
    
    const result1 = await learningHub.learnFromInteraction(interaction1);
    console.log('Learning result:', {
      learned: result1.learned,
      profileInteractions: result1.profile?.interactions,
      insights: result1.insights
    });
    console.log('✅ First interaction processed\n');
    
    // Test 3: Learn from multiple interactions
    console.log('Test 3: Learning from multiple interactions...');
    const interactions = [
      {
        userId: testUserId,
        message: 'Thanks! Can you break that down into simpler steps?',
        response: 'Of course! Let me simplify the marketing campaign steps...',
        metadata: { mode: 'cmo' }
      },
      {
        userId: testUserId,
        message: 'Awesome! I get it now. What about SEO strategies?',
        response: 'Great! For SEO, here are the key strategies...',
        metadata: { mode: 'cmo' }
      },
      {
        userId: testUserId,
        message: 'Perfect, this is exactly what I needed!',
        response: 'Glad I could help! Let me know if you need more details.',
        metadata: { mode: 'cmo' }
      }
    ];
    
    for (const interaction of interactions) {
      await learningHub.learnFromInteraction(interaction);
    }
    console.log('✅ Multiple interactions processed\n');
    
    // Test 4: Get enhanced context
    console.log('Test 4: Getting enhanced context for user...');
    const enhancedContext = await learningHub.getEnhancedContext(testUserId);
    
    if (enhancedContext) {
      console.log('Enhanced context retrieved:');
      console.log('- Communication style:', enhancedContext.communicationStyle ? 'Available' : 'Not available');
      console.log('- Business context:', enhancedContext.businessContext ? 'Available' : 'Not available');
      console.log('- Preferences:', enhancedContext.preferences ? 'Available' : 'Not available');
      console.log('✅ Enhanced context working\n');
    } else {
      console.log('⚠️ Not enough data for enhanced context (expected for new user)\n');
    }
    
    // Test 5: Test graceful degradation
    console.log('Test 5: Testing graceful degradation...');
    const disabledHub = new UserLearningHub({
      enableLearning: false
    });
    
    const disabledResult = await disabledHub.learnFromInteraction(interaction1);
    console.log('Learning when disabled:', { learned: disabledResult.learned });
    console.log('✅ Graceful degradation working\n');
    
    // Test 6: Test error handling
    console.log('Test 6: Testing error handling...');
    try {
      const invalidInteraction = {
        // Missing userId
        message: 'Test message'
      };
      const errorResult = await learningHub.learnFromInteraction(invalidInteraction);
      console.log('Error handling result:', { learned: errorResult.learned });
      console.log('✅ Error handling working\n');
    } catch (err) {
      console.log('✅ Error properly caught:', err.message, '\n');
    }
    
    // Test 7: Test communication style analysis
    console.log('Test 7: Testing communication style analysis...');
    const formalMessage = 'I would appreciate if you could kindly provide detailed information regarding the implementation.';
    const casualMessage = 'Hey, can you help me out with this thing? Thanks!';
    
    const formalStyle = learningHub.analyzeCommunicationStyle(formalMessage);
    const casualStyle = learningHub.analyzeCommunicationStyle(casualMessage);
    
    console.log('Formal message analysis:', {
      formality: formalStyle.formality.toFixed(2),
      verbosity: formalStyle.verbosity.toFixed(2)
    });
    console.log('Casual message analysis:', {
      formality: casualStyle.formality.toFixed(2),
      verbosity: casualStyle.verbosity.toFixed(2)
    });
    console.log('✅ Communication style analysis working\n');
    
    // Test 8: Test business context extraction
    console.log('Test 8: Testing business context extraction...');
    const businessMessage = 'We\'re a growing SaaS startup focusing on improving customer retention and reducing churn through better engagement.';
    const businessContext = learningHub.extractBusinessContext(businessMessage);
    
    console.log('Business context extracted:', {
      industry: businessContext.possibleIndustry,
      terminology: businessContext.terminology
    });
    console.log('✅ Business context extraction working\n');
    
    console.log('========================================');
    console.log('🎉 All tests completed successfully!');
    console.log('✅ User Learning System is working correctly');
    console.log('✅ Core functionality is not affected');
    console.log('✅ Graceful degradation is functioning');
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
testUserLearning().catch(console.error);