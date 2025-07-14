#!/usr/bin/env node

import ContextCompressor from './services/context/ContextCompressor.js';

async function realisticTest() {
  try {
    // Create more realistic test messages
    const destinations = ['Paris', 'Rome', 'Barcelona', 'Tokyo', 'London', 'Amsterdam', 'Prague', 'Vienna'];
    const hotels = ['Hilton', 'Marriott', 'Hyatt', 'Sheraton', 'Four Seasons', 'Ritz Carlton'];
    const activities = ['museum visits', 'food tours', 'city walks', 'boat tours', 'cooking classes'];
    
    const testMessages = Array(150).fill(null).map((_, i) => {
      const messageTypes = [
        // Long planning messages
        `I'm really excited about visiting ${destinations[i % destinations.length]} next summer. I've been researching and found that the best time to visit would be in ${['June', 'July', 'August'][i % 3]} when the weather is perfect. My budget for this portion of the trip is around $${2000 + i * 100}, and I'd like to stay at a nice hotel, preferably the ${hotels[i % hotels.length]} or similar. I'm particularly interested in ${activities[i % activities.length]} and would love your recommendations.`,
        
        // Detailed assistant responses
        `Great choice! ${destinations[i % destinations.length]} is absolutely beautiful in ${['June', 'July', 'August'][i % 3]}. Based on your budget of $${2000 + i * 100}, I recommend staying at the ${hotels[i % hotels.length]} which offers excellent amenities including breakfast, spa services, and a central location. For activities, ${activities[i % activities.length]} are very popular. The average daily cost would be around $${150 + (i % 50)} including accommodation, meals, and activities. Would you like me to check availability?`,
        
        // Decision messages
        `After thinking about it, I've decided to book the ${hotels[i % hotels.length]} in ${destinations[i % destinations.length]} for ${3 + (i % 5)} nights. Please confirm the booking for ${['June', 'July', 'August'][i % 3]} ${10 + (i % 20)}th. Also, I'd like to add travel insurance and airport transfers. My dietary restrictions include being vegetarian and gluten-free.`,
        
        // Questions and concerns
        `I have some concerns about the trip. What's the visa situation for ${destinations[i % destinations.length]}? Also, I'm worried about the language barrier. Do they speak English at the ${hotels[i % hotels.length]}? What about safety in the area? And most importantly, will they be able to accommodate my dietary restrictions at local restaurants?`
      ];
      
      return {
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: messageTypes[i % messageTypes.length],
        created_at: new Date(Date.now() - (150 - i) * 60000).toISOString()
      };
    });
    
    console.log('🧪 Realistic Compression Test\n');
    console.log('Original messages:', testMessages.length);
    
    // Initialize compressor
    const compressor = new ContextCompressor({
      defaultMaxTokens: 2000, // Lower limit to force compression
      minImportanceScore: 0.7  // Higher threshold for importance
    });
    await compressor.initialize();
    
    // Estimate original tokens
    const originalTokens = compressor.countTokens(testMessages);
    console.log('Original tokens:', originalTokens);
    
    // Test compression with different strategies
    const strategies = ['sliding-window', 'hierarchical', 'entity-focused', 'query-relevant'];
    
    console.log('\n📊 Testing Different Strategies:\n');
    
    for (const strategy of strategies) {
      const result = await compressor.compressContext(testMessages, 2000, {
        strategy,
        currentQuery: 'What hotels did we book in Paris and Rome? What are the dates?'
      });
      
      if (result.success && result.compressed) {
        console.log(`${strategy}:`);
        console.log(`  Messages: ${result.originalCount} → ${result.compressedCount}`);
        console.log(`  Tokens: ${originalTokens} → ${result.tokenCount}`);
        console.log(`  Reduction: ${Math.round((1 - result.compressionRatio) * 100)}%`);
        console.log(`  Has summary: ${result.summary ? 'Yes' : 'No'}`);
        console.log('');
      }
    }
    
    // Test auto-selection
    console.log('🤖 Auto-Selected Strategy:\n');
    const autoResult = await compressor.compressContext(testMessages, 2000);
    
    if (autoResult.success && autoResult.compressed) {
      console.log(`Strategy chosen: ${autoResult.strategy}`);
      console.log(`Messages: ${autoResult.originalCount} → ${autoResult.compressedCount}`);
      console.log(`Token reduction: ${Math.round((1 - autoResult.compressionRatio) * 100)}%`);
      
      // Show summary if generated
      if (autoResult.summary) {
        console.log('\n📝 Generated Summary:');
        console.log(autoResult.summary.content);
      }
      
      // Show what types of messages were preserved
      const preservedTypes = {
        bookings: 0,
        decisions: 0,
        questions: 0,
        recent: 0
      };
      
      autoResult.messages.forEach(msg => {
        if (msg.content?.includes('book')) preservedTypes.bookings++;
        if (msg.content?.includes('decided')) preservedTypes.decisions++;
        if (msg.content?.includes('?')) preservedTypes.questions++;
        if (msg.id?.includes('msg-14')) preservedTypes.recent++; // Recent messages
      });
      
      console.log('\n🔖 Preserved Message Types:');
      console.log(`  Bookings: ${preservedTypes.bookings}`);
      console.log(`  Decisions: ${preservedTypes.decisions}`);
      console.log(`  Questions: ${preservedTypes.questions}`);
      console.log(`  Recent messages: ${preservedTypes.recent}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

realisticTest();