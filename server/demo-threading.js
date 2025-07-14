#!/usr/bin/env node

/**
 * Demo: Conversation Threading Functionality
 * 
 * Demonstrates the conversation threading features without requiring database
 */

import BranchDetector from './services/conversations/BranchDetector.js';
import ThreadingUISupport from './services/conversations/ThreadingUISupport.js';

console.log('🎭 Conversation Threading Demo\n');
console.log('This demo shows how the threading system works with a travel planning scenario.\n');

// Sample conversation
const travelConversation = [
  {
    id: 'msg-1',
    role: 'user',
    content: "I'm planning a 2-week trip to Europe in June. Thinking about Paris, Rome, and Barcelona.",
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: "Excellent choices! That's a classic European trio. What's your budget for this trip?",
    created_at: '2024-01-01T10:01:00Z'
  },
  {
    id: 'msg-3',
    role: 'user',
    content: "My budget is around $5000 including flights. I'm a bit worried it might not be enough for all three cities.",
    created_at: '2024-01-01T10:02:00Z'
  },
  {
    id: 'msg-4',
    role: 'user',
    content: "What if we focused just on Paris and Rome instead? Or maybe we should look at cheaper alternatives?",
    created_at: '2024-01-01T10:03:00Z'
  },
  {
    id: 'msg-5',
    role: 'assistant',
    content: "Both are great options! Let me help you explore each possibility.",
    created_at: '2024-01-01T10:04:00Z'
  },
  {
    id: 'msg-6',
    role: 'user',
    content: "Actually, I'm torn between doing a luxury experience in just Paris or a budget tour of all three cities.",
    created_at: '2024-01-01T10:05:00Z'
  }
];

async function demonstrateBranchDetection() {
  console.log('📍 STEP 1: Detecting Natural Branch Points\n');
  
  const detector = new BranchDetector({
    enableLLMDetection: false,
    enablePatternDetection: true
  });
  detector.initialized = true;
  
  const analysis = await detector.analyzeBranchPoints(travelConversation);
  
  console.log('🔍 Analysis Results:');
  console.log(`Found ${analysis.branchPoints.length} potential branch points:\n`);
  
  analysis.branchPoints.forEach((point, index) => {
    console.log(`Branch Point ${index + 1}:`);
    console.log(`  📌 Message: "${point.content.substring(0, 60)}..."`);
    console.log(`  🏷️  Type: ${point.type}`);
    console.log(`  📊 Confidence: ${(point.confidence * 100).toFixed(0)}%`);
    console.log(`  💡 Reason: ${point.reason}`);
    console.log('');
  });
  
  if (analysis.suggestions.length > 0) {
    console.log('💡 Suggestions for the user:');
    analysis.suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion.message}`);
    });
  }
}

function demonstrateConversationTree() {
  console.log('\n\n📍 STEP 2: Visualizing Conversation Tree\n');
  
  const uiSupport = new ThreadingUISupport();
  
  // Mock tree structure showing branches
  const conversationTree = {
    id: 'conv-root',
    title: 'Europe Trip Planning',
    summary: 'Planning 2-week Europe trip',
    status: 'active',
    metadata: {},
    createdAt: '2024-01-01T10:00:00Z',
    children: [
      {
        id: 'conv-branch-1',
        title: 'Paris & Rome Focus',
        summary: 'Exploring 2-city itinerary',
        status: 'active',
        metadata: {
          branch_reason: 'Focus on fewer cities',
          branch_type: 'alternative'
        },
        createdAt: '2024-01-01T10:10:00Z',
        children: []
      },
      {
        id: 'conv-branch-2',
        title: 'Budget 3-City Tour',
        summary: 'Exploring budget options for all cities',
        status: 'active',
        metadata: {
          branch_reason: 'Budget-friendly alternatives',
          branch_type: 'alternative'
        },
        createdAt: '2024-01-01T10:15:00Z',
        children: []
      },
      {
        id: 'conv-branch-3',
        title: 'Luxury Paris Experience',
        summary: 'Deep dive into Paris-only luxury trip',
        status: 'active',
        metadata: {
          branch_reason: 'Luxury experience in one city',
          branch_type: 'exploration'
        },
        createdAt: '2024-01-01T10:20:00Z',
        children: []
      }
    ]
  };
  
  const visualTree = uiSupport.transformTreeForVisualization(conversationTree, {
    selectedThreadId: 'conv-branch-1',
    expandedNodes: ['conv-root']
  });
  
  console.log('🌳 Conversation Tree Structure:');
  console.log(`\n📁 ${visualTree.title}`);
  visualTree.children.forEach((branch, index) => {
    console.log(`  └─ 🌿 Branch ${index + 1}: ${branch.title}`);
    console.log(`      • Reason: ${branch.metadata.branchReason}`);
    console.log(`      • Type: ${branch.metadata.branchType}`);
    console.log(`      • Status: ${branch.status}`);
  });
}

function demonstrateBranchComparison() {
  console.log('\n\n📍 STEP 3: Comparing Different Branches\n');
  
  const uiSupport = new ThreadingUISupport();
  
  // Mock thread data for comparison
  const threadData = {
    'conv-branch-1': {
      id: 'conv-branch-1',
      title: 'Paris & Rome Focus',
      summary: '2 cities, moderate pace',
      messages: [],
      metrics: {
        estimatedCost: 4500,
        duration: 14,
        cities: 2,
        pace: 'moderate'
      }
    },
    'conv-branch-2': {
      id: 'conv-branch-2',
      title: 'Budget 3-City Tour',
      summary: 'All 3 cities, fast pace, budget-friendly',
      messages: [],
      metrics: {
        estimatedCost: 3500,
        duration: 14,
        cities: 3,
        pace: 'fast'
      }
    },
    'conv-branch-3': {
      id: 'conv-branch-3',
      title: 'Luxury Paris Experience',
      summary: '1 city, relaxed pace, premium experience',
      messages: [],
      metrics: {
        estimatedCost: 5000,
        duration: 14,
        cities: 1,
        pace: 'relaxed'
      }
    }
  };
  
  console.log('📊 Branch Comparison:');
  console.log('\n┌─────────────────────┬───────────────┬───────────────┬─────────────────┐');
  console.log('│ Aspect              │ Paris & Rome  │ Budget 3-City │ Luxury Paris    │');
  console.log('├─────────────────────┼───────────────┼───────────────┼─────────────────┤');
  console.log('│ Estimated Cost      │ $4,500        │ $3,500        │ $5,000          │');
  console.log('│ Cities              │ 2             │ 3             │ 1               │');
  console.log('│ Pace                │ Moderate      │ Fast          │ Relaxed         │');
  console.log('│ Experience Type     │ Balanced      │ Budget        │ Luxury          │');
  console.log('└─────────────────────┴───────────────┴───────────────┴─────────────────┘');
}

function demonstrateMergeScenario() {
  console.log('\n\n📍 STEP 4: Thread Merging Scenario\n');
  
  console.log('Scenario: User explored different options and wants to merge insights\n');
  
  console.log('🔀 Merge Process:');
  console.log('1. Identify common elements (shared preferences, constraints)');
  console.log('2. Detect conflicts (different decisions, incompatible choices)');
  console.log('3. Resolve conflicts using strategies:');
  console.log('   • Chronological: Keep most recent decisions');
  console.log('   • Intelligent: Merge based on context and importance');
  console.log('   • Manual: User selects preferred options');
  console.log('4. Create unified conversation history');
  console.log('5. Preserve branch history for reference');
  
  console.log('\n📋 Example Merge Result:');
  console.log('✅ Common Elements: Budget ($5000), Duration (2 weeks), Month (June)');
  console.log('⚠️  Conflicts Resolved:');
  console.log('   • Cities: Chose Paris & Rome (compromise between all options)');
  console.log('   • Style: Mixed luxury/budget (allocate budget strategically)');
  console.log('✅ Final Plan: Moderate pace through Paris & Rome with strategic splurges');
}

function demonstrateUseCases() {
  console.log('\n\n📍 STEP 5: Real-World Use Cases\n');
  
  const useCases = [
    {
      title: '🏖️ Destination Comparison',
      description: 'User creates branches to compare beach vs mountain destinations',
      branches: ['Caribbean Cruise', 'Swiss Alps Adventure', 'Mixed Costa Rica Trip']
    },
    {
      title: '💰 Budget Scenarios',
      description: 'Explore same trip with different budget constraints',
      branches: ['Backpacker $2K', 'Comfort $5K', 'Luxury $10K+']
    },
    {
      title: '👥 Group vs Solo',
      description: 'Plan variations for different travel companions',
      branches: ['Solo Adventure', 'Romantic Getaway', 'Family Vacation']
    },
    {
      title: '📅 Timing Options',
      description: 'Compare same destination in different seasons',
      branches: ['Summer Peak Season', 'Fall Shoulder Season', 'Winter Off-Season']
    }
  ];
  
  console.log('Common Threading Use Cases:\n');
  useCases.forEach((useCase, index) => {
    console.log(`${index + 1}. ${useCase.title}`);
    console.log(`   ${useCase.description}`);
    console.log(`   Branches: ${useCase.branches.join(' | ')}`);
    console.log('');
  });
}

// Run all demonstrations
async function runDemo() {
  await demonstrateBranchDetection();
  demonstrateConversationTree();
  demonstrateBranchComparison();
  demonstrateMergeScenario();
  demonstrateUseCases();
  
  console.log('\n✨ Demo Complete!\n');
  console.log('The conversation threading system enables users to:');
  console.log('• Explore multiple travel options simultaneously');
  console.log('• Compare different scenarios side-by-side');
  console.log('• Merge insights from various explorations');
  console.log('• Make informed decisions with full context');
  console.log('• Never lose track of alternative ideas\n');
}

runDemo();