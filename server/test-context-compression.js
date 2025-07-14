/**
 * Test Context Compression System
 * 
 * Tests the context compression functionality with various conversation lengths
 * and different compression strategies.
 */

import ContextCompressor from './services/context/ContextCompressor.js';
import ImportanceScorer from './services/context/ImportanceScorer.js';
import SummaryGenerator from './services/context/SummaryGenerator.js';
import { compressionConfig } from './config/compression.js';

// Test data generator
function generateTestMessages(count, options = {}) {
  const messages = [];
  const destinations = ['Paris', 'Rome', 'Barcelona', 'Tokyo', 'London', 'New York'];
  const topics = ['budget', 'hotel', 'flight', 'activity', 'restaurant', 'visa'];
  
  for (let i = 0; i < count; i++) {
    const isUser = i % 2 === 0;
    const destination = destinations[Math.floor(Math.random() * destinations.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    
    let content = '';
    
    if (isUser) {
      // Generate user messages
      const messageTypes = [
        `What ${topic} options do you recommend for ${destination}?`,
        `I'm thinking about visiting ${destination} in June. My budget is $${Math.floor(Math.random() * 5000 + 1000)}.`,
        `I prefer ${topic === 'hotel' ? 'boutique hotels' : topic === 'restaurant' ? 'local cuisine' : 'cultural activities'}.`,
        `Can you help me plan a trip to ${destination}?`,
        `I need to book a ${topic} for my ${destination} trip.`,
        `What's the best time to visit ${destination}?`
      ];
      
      content = messageTypes[Math.floor(Math.random() * messageTypes.length)];
      
      // Add important messages
      if (i === Math.floor(count * 0.3)) {
        content = `I've decided to visit ${destination} from June 15-25. Please help me book flights.`;
      } else if (i === Math.floor(count * 0.6)) {
        content = `My total budget is $3000 and I'm traveling with my partner.`;
      } else if (i === Math.floor(count * 0.8)) {
        content = `I've confirmed the hotel booking at Grand Hotel ${destination}. Confirmation: HTL${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      }
    } else {
      // Generate assistant messages
      const responseTypes = [
        `For ${destination}, I'd recommend looking into ${topic} options in the city center.`,
        `Based on your preferences, here are some ${topic} suggestions for ${destination}...`,
        `The best time to visit ${destination} is typically in spring or fall.`,
        `I can help you find great ${topic} options within your budget.`,
        `Let me search for available ${topic} options in ${destination}.`
      ];
      
      content = responseTypes[Math.floor(Math.random() * responseTypes.length)];
    }
    
    messages.push({
      id: `msg_${i}`,
      role: isUser ? 'user' : 'assistant',
      content,
      created_at: new Date(Date.now() - (count - i) * 60000).toISOString()
    });
  }
  
  return messages;
}

// Test different compression strategies
async function testCompressionStrategies() {
  console.log('🧪 Testing Context Compression System\n');
  
  const compressor = new ContextCompressor();
  await compressor.initialize();
  
  // Test configurations
  const testCases = [
    { messageCount: 20, name: 'Short conversation' },
    { messageCount: 50, name: 'Medium conversation' },
    { messageCount: 100, name: 'Long conversation' },
    { messageCount: 200, name: 'Very long conversation' }
  ];
  
  const strategies = ['sliding-window', 'hierarchical', 'entity-focused', 'query-relevant'];
  
  for (const testCase of testCases) {
    console.log(`\n📊 Testing: ${testCase.name} (${testCase.messageCount} messages)`);
    console.log('='.repeat(60));
    
    const messages = generateTestMessages(testCase.messageCount);
    const currentQuery = "What's the final plan for my Paris trip?";
    
    for (const strategy of strategies) {
      console.log(`\n🔧 Strategy: ${strategy}`);
      
      const startTime = Date.now();
      
      const result = await compressor.compressContext(messages, 2000, {
        strategy,
        currentQuery,
        model: 'gpt-4'
      });
      
      const endTime = Date.now();
      
      if (result.success) {
        console.log(`   ✅ Compression successful`);
        console.log(`   📉 Original messages: ${result.originalCount || messages.length}`);
        console.log(`   📊 Compressed messages: ${result.compressedCount || result.messages.length}`);
        console.log(`   💾 Token count: ${result.tokenCount}`);
        console.log(`   📈 Compression ratio: ${(result.compressionRatio * 100).toFixed(1)}%`);
        console.log(`   ⏱️  Processing time: ${endTime - startTime}ms`);
        
        if (result.summary) {
          console.log(`   📝 Summary included: Yes`);
        }
        
        if (result.droppedMessages && result.droppedMessages.length > 0) {
          console.log(`   🗑️  Dropped messages: ${result.droppedMessages.length}`);
        }
      } else {
        console.log(`   ❌ Compression failed: ${result.error}`);
      }
    }
  }
}

// Test key point extraction
async function testKeyPointExtraction() {
  console.log('\n\n🔍 Testing Key Point Extraction\n');
  console.log('='.repeat(60));
  
  const compressor = new ContextCompressor();
  await compressor.initialize();
  
  const messages = generateTestMessages(50);
  
  const result = await compressor.extractKeyPoints(messages);
  
  if (result.success) {
    console.log('✅ Key point extraction successful\n');
    
    const keyPoints = result.keyPoints;
    
    console.log(`📌 Decisions found: ${keyPoints.decisions?.length || 0}`);
    if (keyPoints.decisions?.length > 0) {
      console.log('   Examples:');
      keyPoints.decisions.slice(0, 3).forEach((d, i) => {
        console.log(`   ${i + 1}. ${d.content.substring(0, 80)}...`);
      });
    }
    
    console.log(`\n❤️  Preferences found: ${keyPoints.preferences?.length || 0}`);
    if (keyPoints.preferences?.length > 0) {
      console.log('   Examples:');
      keyPoints.preferences.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.content.substring(0, 80)}...`);
      });
    }
    
    console.log(`\n⚠️  Constraints found: ${keyPoints.constraints?.length || 0}`);
    console.log(`❓ Open questions: ${keyPoints.questions?.length || 0}`);
    console.log(`🏷️  Unique entities: ${keyPoints.entities?.size || 0}`);
    
    if (keyPoints.entities?.size > 0) {
      console.log('\n   Entity types:');
      for (const [type, entities] of keyPoints.entities) {
        console.log(`   - ${type}: ${entities.length} found`);
      }
    }
  } else {
    console.log(`❌ Key point extraction failed: ${result.error}`);
  }
}

// Test importance scoring
async function testImportanceScoring() {
  console.log('\n\n📊 Testing Importance Scoring\n');
  console.log('='.repeat(60));
  
  const scorer = new ImportanceScorer();
  await scorer.initialize();
  
  const testMessages = [
    { 
      content: "I've decided to book the Paris trip for June 15-25.", 
      role: 'user',
      expected: 'High (decision)' 
    },
    { 
      content: "What restaurants do you recommend?", 
      role: 'user',
      expected: 'Medium (question)' 
    },
    { 
      content: "My budget is $5000 and I'm allergic to shellfish.", 
      role: 'user',
      expected: 'High (constraint)' 
    },
    { 
      content: "Booking confirmed! Reference: HTL123ABC", 
      role: 'assistant',
      expected: 'Very High (booking)' 
    },
    { 
      content: "Thanks for the information.", 
      role: 'user',
      expected: 'Low (generic)' 
    }
  ];
  
  for (const [index, msg] of testMessages.entries()) {
    const score = await scorer.scoreMessage(msg, index, testMessages);
    
    console.log(`\nMessage: "${msg.content}"`);
    console.log(`Expected importance: ${msg.expected}`);
    console.log(`Calculated score: ${score.finalScore.toFixed(2)}`);
    console.log(`Categories: ${score.categories.join(', ') || 'none'}`);
    
    // Show top factors
    const topFactors = Object.entries(score.factors)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (topFactors.length > 0) {
      console.log('Top factors:');
      topFactors.forEach(([factor, value]) => {
        console.log(`  - ${factor}: ${value.toFixed(2)}`);
      });
    }
  }
}

// Test summary generation
async function testSummaryGeneration() {
  console.log('\n\n📝 Testing Summary Generation\n');
  console.log('='.repeat(60));
  
  const generator = new SummaryGenerator();
  await generator.initialize();
  
  const messages = generateTestMessages(30);
  const styles = ['concise', 'comprehensive', 'bullets', 'timeline'];
  
  for (const style of styles) {
    console.log(`\n📋 Style: ${style}`);
    console.log('-'.repeat(40));
    
    const result = await generator.generateSummary(messages, {
      style,
      maxLength: 300
    });
    
    console.log(result.text);
    console.log(`\n(Length: ${result.text.length} characters)`);
  }
}

// Test progressive summarization
async function testProgressiveSummarization() {
  console.log('\n\n🔄 Testing Progressive Summarization\n');
  console.log('='.repeat(60));
  
  const generator = new SummaryGenerator();
  await generator.initialize();
  
  const allMessages = generateTestMessages(100);
  
  // Split into chunks
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < allMessages.length; i += chunkSize) {
    chunks.push(allMessages.slice(i, i + chunkSize));
  }
  
  console.log(`Split ${allMessages.length} messages into ${chunks.length} chunks`);
  
  const result = await generator.generateProgressiveSummary(chunks);
  
  console.log('\nChunk summaries:');
  result.chunkSummaries.forEach((summary, index) => {
    console.log(`\nChunk ${index + 1}: ${summary.text}`);
  });
  
  console.log('\n\nFinal consolidated summary:');
  console.log(result.finalSummary.text);
}

// Test configuration
async function testConfiguration() {
  console.log('\n\n⚙️  Testing Configuration\n');
  console.log('='.repeat(60));
  
  console.log('Global settings:');
  console.log(`  Compression enabled: ${compressionConfig.global.enabled}`);
  console.log(`  Default strategy: ${compressionConfig.global.defaultStrategy}`);
  console.log(`  Max context tokens: ${compressionConfig.global.maxContextTokens}`);
  console.log(`  Compression threshold: ${compressionConfig.global.compressionThreshold * 100}%`);
  
  console.log('\nModel token limits:');
  const models = ['gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'gemini-1.5-pro'];
  models.forEach(model => {
    const limit = compressionConfig.modelLimits[model] || 'Not configured';
    console.log(`  ${model}: ${typeof limit === 'number' ? limit.toLocaleString() : limit} tokens`);
  });
  
  console.log('\nImportance weights:');
  Object.entries(compressionConfig.importanceScoring.weights).forEach(([factor, weight]) => {
    console.log(`  ${factor}: ${weight}`);
  });
}

// Main test runner
async function runAllTests() {
  try {
    console.log('🚀 Starting Context Compression Tests\n');
    console.log('=' .repeat(60));
    
    // Run all tests
    await testCompressionStrategies();
    await testKeyPointExtraction();
    await testImportanceScoring();
    await testSummaryGeneration();
    await testProgressiveSummarization();
    await testConfiguration();
    
    console.log('\n\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n\n❌ Test failed with error:', error);
    console.error(error.stack);
  }
}

// Run tests
runAllTests();