/**
 * Comprehensive Test Suite for Tala Intelligence System
 * 
 * Tests context management, profile building, agent routing,
 * context compression, memory retrieval, and multi-agent coordination
 */

import TalaIntelligence from './services/intelligence/TalaIntelligence.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load test environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.test') });

// Test scenarios
const testScenarios = {
  simpleQuery: {
    userId: 'test_user_1',
    content: 'What documents do I need for traveling to Japan?',
    conversationId: 'conv_simple_1'
  },
  
  complexItinerary: {
    userId: 'test_user_2',
    content: 'I need to plan a 2-week trip to Paris, Rome, and Barcelona for my family of 4. We need flights, hotels, and activities for each city.',
    conversationId: 'conv_complex_1',
    data: {
      travelers: 4,
      budget: 10000,
      dates: { start: '2025-08-01', end: '2025-08-14' }
    }
  },
  
  contextualFollowUp: {
    userId: 'test_user_1',
    content: 'What about visa requirements there?',
    conversationId: 'conv_simple_1'
  },
  
  emailParsing: {
    userId: 'test_user_3',
    content: 'Parse this email and extract my flight booking details',
    conversationId: 'conv_email_1',
    data: {
      emailContent: `
        Subject: Your Flight Confirmation - UA456
        
        Dear Jane Doe,
        Your flight from San Francisco to Tokyo is confirmed.
        Flight: UA456
        Date: July 20, 2025
        Departure: 11:30 AM (SFO)
        Arrival: 3:45 PM +1 day (NRT)
        Confirmation: XYZ789
      `
    }
  },
  
  multiAgentTask: {
    userId: 'test_user_4',
    content: 'I have a business trip next month. Parse my flight confirmation email, create an itinerary, and give me a todo list for preparation.',
    conversationId: 'conv_multi_1',
    data: {
      emailContent: 'Flight confirmation...',
      destination: 'London',
      duration: '5 days'
    }
  }
};

// Test runner
async function runIntelligenceTests() {
  console.log('🧪 Starting Tala Intelligence System Tests\n');
  
  const intelligence = new TalaIntelligence({
    maxContextSize: 8000,
    compressionThreshold: 0.8,
    memoryRetrievalLimit: 10,
    learningEnabled: true,
    // Use mock services for testing
    mockMode: true
  });
  
  try {
    // Initialize system
    console.log('🚀 Test 1: System Initialization');
    console.log('=====================================');
    await intelligence.initialize();
    console.log('✅ Intelligence system initialized successfully\n');
    
    // Test simple query
    console.log('📝 Test 2: Simple Query Processing');
    console.log('=====================================');
    const simpleResult = await testSimpleQuery(intelligence);
    console.log(`✅ Simple query processed in ${simpleResult.metadata.executionTime}ms`);
    console.log(`   Agents used: ${simpleResult.metadata.agentsUsed.join(', ')}`);
    console.log(`   Context size: ${simpleResult.metadata.contextSize} tokens\n`);
    
    // Test profile building
    console.log('👤 Test 3: Profile Building');
    console.log('=====================================');
    await testProfileBuilding(intelligence);
    console.log('✅ Profile building test completed\n');
    
    // Test memory storage and retrieval
    console.log('💭 Test 4: Memory Management');
    console.log('=====================================');
    await testMemoryManagement(intelligence);
    console.log('✅ Memory management test completed\n');
    
    // Test contextual follow-up
    console.log('🔄 Test 5: Contextual Follow-up');
    console.log('=====================================');
    const contextResult = await testContextualFollowUp(intelligence);
    console.log(`✅ Contextual query processed successfully`);
    console.log(`   Retrieved ${contextResult.metadata.memoriesUsed} relevant memories\n`);
    
    // Test complex multi-destination itinerary
    console.log('✈️ Test 6: Complex Itinerary Planning');
    console.log('=====================================');
    const itineraryResult = await testComplexItinerary(intelligence);
    console.log(`✅ Complex itinerary processed in ${itineraryResult.metadata.executionTime}ms`);
    console.log(`   Agents used: ${itineraryResult.metadata.agentsUsed.join(', ')}\n`);
    
    // Test email parsing
    console.log('📧 Test 7: Email Parsing');
    console.log('=====================================');
    const emailResult = await testEmailParsing(intelligence);
    console.log(`✅ Email parsed successfully`);
    console.log(`   Extracted booking confirmation: ${emailResult.response.content.includes('XYZ789')}\n`);
    
    // Test multi-agent coordination
    console.log('🤝 Test 8: Multi-Agent Coordination');
    console.log('=====================================');
    const multiAgentResult = await testMultiAgentCoordination(intelligence);
    console.log(`✅ Multi-agent task completed in ${multiAgentResult.metadata.executionTime}ms`);
    console.log(`   Agents coordinated: ${multiAgentResult.metadata.agentsUsed.length}\n`);
    
    // Test context compression
    console.log('🗜️ Test 9: Context Compression');
    console.log('=====================================');
    await testContextCompression(intelligence);
    console.log('✅ Context compression test completed\n');
    
    // Test learning and feedback
    console.log('🧮 Test 10: Learning and Feedback');
    console.log('=====================================');
    await testLearningAndFeedback(intelligence);
    console.log('✅ Learning and feedback test completed\n');
    
    // Test monitoring and metrics
    console.log('📊 Test 11: System Metrics');
    console.log('=====================================');
    const metrics = intelligence.getMetrics();
    console.log('System Performance Metrics:');
    console.log(`   Total requests: ${metrics.totalRequests}`);
    console.log(`   Successful responses: ${metrics.successfulResponses}`);
    console.log(`   Average response time: ${metrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`   Context compression ratio: ${(metrics.contextCompressionRatio || 0).toFixed(2)}`);
    console.log(`   Memory save rate: ${metrics.memorySaveRate}`);
    console.log('\nAgent Utilization:');
    metrics.agentUtilization.forEach((count, agentId) => {
      console.log(`   ${agentId}: ${count} tasks`);
    });
    console.log('\n✅ All metrics retrieved successfully\n');
    
    // Shutdown
    await intelligence.shutdown();
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await intelligence.shutdown();
    process.exit(1);
  }
}

// Individual test functions

async function testSimpleQuery(intelligence) {
  const request = {
    ...testScenarios.simpleQuery,
    timestamp: new Date()
  };
  
  const result = await intelligence.processRequest(request);
  
  if (!result.success) {
    throw new Error(`Simple query failed: ${result.error}`);
  }
  
  // Verify response contains relevant information
  const response = result.response.content;
  if (!response) {
    throw new Error('No response content received');
  }
  
  // Response can be either string or object
  if (typeof response !== 'string' && typeof response !== 'object') {
    throw new Error('Invalid response format - expected string or object');
  }
  
  return result;
}

async function testProfileBuilding(intelligence) {
  // Create initial profile
  const profile = await intelligence.profileManager.createProfile('test_user_profile', {
    preferences: {
      responseStyle: 'detailed',
      memoryThreshold: 0.6,
      outputFormat: 'markdown'
    },
    expertise: ['travel', 'technology']
  });
  
  if (!profile.id) {
    throw new Error('Profile creation failed');
  }
  
  // Update profile
  await intelligence.profileManager.updateProfile(profile.id, {
    preferences: {
      responseStyle: 'concise'
    }
  });
  
  // Retrieve updated profile
  const updated = await intelligence.profileManager.getProfile('test_user_profile');
  if (updated.preferences.responseStyle !== 'concise') {
    throw new Error('Profile update failed');
  }
}

async function testMemoryManagement(intelligence) {
  // Create a memory
  const memory = await intelligence.memoryManager.createMemory({
    userId: 'test_user_memory',
    content: {
      interaction: {
        request: 'Book a flight to Tokyo',
        response: 'Flight booked for July 20',
        context: { type: 'booking', destination: 'Tokyo' }
      }
    },
    type: 'interaction',
    importance: 0.8,
    tags: ['booking', 'flight', 'Tokyo']
  });
  
  if (!memory.id) {
    throw new Error('Memory creation failed');
  }
  
  console.log(`💾 Created memory ${memory.id} for user ${memory.userId}`);
  
  // Retrieve memories
  const memories = await intelligence.memoryManager.retrieveMemories({
    userId: 'test_user_memory',
    query: 'tokyo',
    limit: 5
  });
  
  console.log(`🔍 Retrieved ${memories.length} memories for user test_user_memory`);
  
  if (memories.length === 0) {
    throw new Error('Memory retrieval failed');
  }
  
  // Verify memory content
  const retrieved = memories.find(m => m.id === memory.id);
  if (!retrieved || retrieved.importance !== 0.8) {
    throw new Error('Memory data mismatch');
  }
}

async function testContextualFollowUp(intelligence) {
  // First, process initial query to establish context
  await intelligence.processRequest({
    ...testScenarios.simpleQuery,
    timestamp: new Date()
  });
  
  // Wait a bit to ensure memory is saved
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Process follow-up query
  const followUpRequest = {
    ...testScenarios.contextualFollowUp,
    timestamp: new Date()
  };
  
  const result = await intelligence.processRequest(followUpRequest);
  
  if (!result.success) {
    throw new Error(`Contextual follow-up failed: ${result.error}`);
  }
  
  // Verify context was used (should have memories)
  if (result.metadata.memoriesUsed === 0) {
    console.warn('⚠️  No memories used in contextual follow-up');
  }
  
  return result;
}

async function testComplexItinerary(intelligence) {
  const request = {
    ...testScenarios.complexItinerary,
    timestamp: new Date()
  };
  
  const result = await intelligence.processRequest(request);
  
  if (!result.success) {
    throw new Error(`Complex itinerary failed: ${result.error}`);
  }
  
  // Should use itinerary builder agent
  if (!result.metadata.agentsUsed.some(agent => 
    agent.toLowerCase().includes('itinerary'))) {
    throw new Error('Itinerary agent not used for complex planning');
  }
  
  return result;
}

async function testEmailParsing(intelligence) {
  const request = {
    ...testScenarios.emailParsing,
    timestamp: new Date()
  };
  
  const result = await intelligence.processRequest(request);
  
  if (!result.success) {
    throw new Error(`Email parsing failed: ${result.error}`);
  }
  
  // Should use email parsing agent
  if (!result.metadata.agentsUsed.some(agent => 
    agent.toLowerCase().includes('email'))) {
    throw new Error('Email agent not used for parsing');
  }
  
  return result;
}

async function testMultiAgentCoordination(intelligence) {
  const request = {
    ...testScenarios.multiAgentTask,
    timestamp: new Date()
  };
  
  const result = await intelligence.processRequest(request);
  
  if (!result.success) {
    throw new Error(`Multi-agent coordination failed: ${result.error}`);
  }
  
  // Should use multiple agents
  if (result.metadata.agentsUsed.length < 2) {
    throw new Error('Multiple agents not coordinated');
  }
  
  return result;
}

async function testContextCompression(intelligence) {
  // Create a large context by adding many messages
  const conversationId = 'conv_compression_test';
  const userId = 'test_user_compression';
  
  // Add many messages to build up context
  for (let i = 0; i < 30; i++) {
    await intelligence.processRequest({
      userId,
      conversationId,
      content: `This is test message ${i} with some content about travel planning, destinations, and various requirements that will build up the context size over time.`,
      timestamp: new Date()
    });
  }
  
  // Process one more request - should trigger compression
  const result = await intelligence.processRequest({
    userId,
    conversationId,
    content: 'Summarize our conversation',
    timestamp: new Date()
  });
  
  if (!result.success) {
    throw new Error('Context compression test failed');
  }
  
  // Check if compression was applied
  const metrics = intelligence.getMetrics();
  if (metrics.contextCompressionRatio === 0) {
    console.warn('⚠️  Context compression may not have been triggered');
  }
}

async function testLearningAndFeedback(intelligence) {
  // Process a request
  const request = {
    userId: 'test_user_learning',
    content: 'Help me plan a trip to Paris',
    conversationId: 'conv_learning_1',
    timestamp: new Date()
  };
  
  const result = await intelligence.processRequest(request);
  
  if (!result.success) {
    throw new Error('Learning test request failed');
  }
  
  // Submit positive feedback
  await intelligence.processFeedback({
    requestId: result.metadata.requestId,
    userId: request.userId,
    rating: 5,
    comment: 'Very helpful response!',
    timestamp: new Date()
  });
  
  // Submit negative feedback for another request
  const result2 = await intelligence.processRequest({
    ...request,
    conversationId: 'conv_learning_2'
  });
  
  await intelligence.processFeedback({
    requestId: result2.metadata.requestId,
    userId: request.userId,
    rating: 2,
    comment: 'Not what I was looking for',
    timestamp: new Date()
  });
  
  // Check learning metrics
  const learningMetrics = intelligence.learningEngine.getMetrics();
  if (learningMetrics.feedbackReceived < 2) {
    throw new Error('Feedback not properly recorded');
  }
}

// Run all tests
runIntelligenceTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});