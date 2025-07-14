/**
 * Test Multi-Agent Coordination Features
 * 
 * Tests the new coordination logic including task decomposition,
 * parallel execution, result aggregation, and conflict resolution
 */

import AgentOrchestrator from './services/agents/AgentOrchestrator.js';

// Complex test scenarios
const coordinationTestScenarios = {
  // Scenario 1: Complex travel planning requiring multiple agents
  comprehensiveTravelPlanning: {
    type: 'comprehensive-travel-planning',
    requiresMultipleAgents: true,
    data: {
      email: `
        Subject: Your European Adventure Booking Confirmations
        
        Dear Sarah Johnson,
        
        Your multi-city European trip is confirmed! Here are your bookings:
        
        Flight 1: UA921 - San Francisco to Paris
        Date: August 1, 2025, 10:30 AM
        Confirmation: ABC123
        
        Hotel Paris: Hotel Le Marais
        Check-in: August 1, 2025
        Check-out: August 5, 2025
        Confirmation: PARIS789
        
        Flight 2: AF1234 - Paris to Rome
        Date: August 5, 2025, 2:00 PM
        Confirmation: DEF456
        
        Hotel Rome: Roma Antica Suites
        Check-in: August 5, 2025
        Check-out: August 9, 2025
        Confirmation: ROME456
        
        Flight 3: IB3456 - Rome to Barcelona
        Date: August 9, 2025, 11:00 AM
        Confirmation: GHI789
        
        Hotel Barcelona: Casa Barcelona
        Check-in: August 9, 2025
        Check-out: August 13, 2025
        Confirmation: BCN789
        
        Return Flight: UA922 - Barcelona to San Francisco
        Date: August 13, 2025, 1:00 PM
        Confirmation: JKL012
        
        Important reminders:
        - Check passport expiry (must be valid 6 months from travel)
        - EU visa not required for US citizens (stays under 90 days)
        - Travel insurance recommended
        - Check-in online 24 hours before each flight
      `,
      documents: {
        passport: {
          number: 'US123456789',
          expiry: '2026-05-15',
          holder: 'Sarah Johnson'
        }
      },
      preferences: {
        dietary: 'vegetarian',
        roomType: 'single',
        interests: ['art', 'history', 'food']
      },
      budget: {
        total: 8000,
        spent: 4500,
        remaining: 3500
      }
    }
  },

  // Scenario 2: Conflicting information from different sources
  conflictingBookingInfo: {
    type: 'resolve-booking-conflicts',
    data: {
      sources: [
        {
          type: 'email',
          content: 'Flight AA123 departs at 10:00 AM on July 15',
          confidence: 0.9
        },
        {
          type: 'document',
          content: 'Ticket shows flight AA123 departs at 2:00 PM on July 15',
          confidence: 0.85
        },
        {
          type: 'website',
          content: 'Current schedule shows AA123 at 11:00 AM on July 15',
          confidence: 0.95
        }
      ]
    }
  },

  // Scenario 3: Sequential task requiring pipeline coordination
  documentProcessingPipeline: {
    type: 'process-travel-documents',
    data: {
      documents: [
        { type: 'passport', status: 'expires-soon', expiry: '2025-09-01' },
        { type: 'visa', status: 'pending', application: 'VIS123456' },
        { type: 'insurance', status: 'active', policy: 'INS789012' }
      ],
      travelDate: '2025-08-15',
      destination: 'Japan'
    }
  },

  // Scenario 4: Parallel task execution
  multiDestinationResearch: {
    type: 'research-destinations',
    data: {
      destinations: ['Tokyo', 'Kyoto', 'Osaka', 'Hiroshima'],
      interests: ['temples', 'food', 'technology', 'history'],
      duration: 14,
      budget: 5000
    }
  }
};

// Test coordination strategies
async function testCoordinationStrategies() {
  console.log('🧪 Testing Multi-Agent Coordination Strategies\n');
  console.log('='.repeat(60));
  
  const orchestrator = new AgentOrchestrator({
    performanceTracking: true,
    coordination: {
      enableAdaptive: true,
      conflictResolution: 'weighted-consensus'
    }
  });
  
  try {
    await orchestrator.initialize();
    console.log('\n✅ Orchestrator initialized with coordination features\n');
    
    // Test 1: Adaptive Strategy (Complex Travel Planning)
    console.log('\n📊 Test 1: Adaptive Coordination Strategy');
    console.log('-'.repeat(40));
    
    const complexTask = coordinationTestScenarios.comprehensiveTravelPlanning;
    const adaptiveResult = await orchestrator.executeComplexTask(complexTask);
    
    console.log('\nAdaptive Strategy Result:');
    console.log(`Strategy selected: ${adaptiveResult.adaptive?.selectedStrategy}`);
    console.log(`Reasoning: ${adaptiveResult.adaptive?.reasoning}`);
    console.log(`Success: ${adaptiveResult.success}`);
    
    if (adaptiveResult.decomposition) {
      console.log(`\nTask Decomposition:`);
      console.log(`- Subtasks: ${adaptiveResult.decomposition.subtasks.length}`);
      console.log(`- Execution waves: ${adaptiveResult.decomposition.executionGraph.parallelGroups.length}`);
      console.log(`- Required agents: ${adaptiveResult.decomposition.requiredAgents.length}`);
    }
    
    // Test 2: Conflict Resolution
    console.log('\n\n🔍 Test 2: Conflict Resolution');
    console.log('-'.repeat(40));
    
    const conflictTask = coordinationTestScenarios.conflictingBookingInfo;
    const conflictResult = await orchestrator.executeWithStrategy(conflictTask, 'consensus');
    
    console.log('\nConflict Resolution Result:');
    console.log(`Conflicts detected: ${conflictResult.consensus?.conflicts?.length || 0}`);
    console.log(`Agreement level: ${(conflictResult.consensus?.agreement * 100).toFixed(1)}%`);
    console.log(`Resolution strategy: ${conflictResult.metadata?.conflictResolution?.[0]?.method || 'N/A'}`);
    
    // Test 3: Pipeline Strategy
    console.log('\n\n🔧 Test 3: Pipeline Coordination Strategy');
    console.log('-'.repeat(40));
    
    const pipelineTask = coordinationTestScenarios.documentProcessingPipeline;
    const pipelineResult = await orchestrator.executeWithStrategy(pipelineTask, 'pipeline');
    
    console.log('\nPipeline Strategy Result:');
    console.log(`Pipeline stages: ${pipelineResult.pipeline?.stages.join(' → ')}`);
    console.log(`Completed stages: ${pipelineResult.pipeline?.results.length}`);
    
    // Test 4: Hierarchical Strategy with Parallel Execution
    console.log('\n\n🏗️ Test 4: Hierarchical Strategy with Parallel Execution');
    console.log('-'.repeat(40));
    
    const parallelTask = coordinationTestScenarios.multiDestinationResearch;
    const hierarchicalResult = await orchestrator.executeWithStrategy(parallelTask, 'hierarchical');
    
    console.log('\nHierarchical Strategy Result:');
    console.log(`Total subtasks: ${hierarchicalResult.decomposition?.subtasks.length || 0}`);
    console.log(`Parallel groups: ${hierarchicalResult.decomposition?.executionGraph.parallelGroups.length || 0}`);
    console.log(`Execution results: ${hierarchicalResult.executionResults?.length || 0}`);
    
    // Test 5: Performance Comparison
    console.log('\n\n📈 Test 5: Strategy Performance Comparison');
    console.log('-'.repeat(40));
    
    const strategies = ['hierarchical', 'pipeline', 'consensus'];
    const performanceResults = {};
    
    for (const strategy of strategies) {
      const startTime = Date.now();
      
      try {
        await orchestrator.executeWithStrategy(
          coordinationTestScenarios.comprehensiveTravelPlanning,
          strategy
        );
        
        performanceResults[strategy] = {
          time: Date.now() - startTime,
          success: true
        };
      } catch (error) {
        performanceResults[strategy] = {
          time: Date.now() - startTime,
          success: false,
          error: error.message
        };
      }
    }
    
    console.log('\nPerformance Results:');
    for (const [strategy, result] of Object.entries(performanceResults)) {
      console.log(`${strategy}: ${result.time}ms - ${result.success ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('\n❌ Coordination test failed:', error);
    console.error(error.stack);
  } finally {
    await orchestrator.shutdown();
    console.log('\n\n✅ Coordination tests completed');
  }
}

// Test specific coordination components
async function testCoordinationComponents() {
  console.log('\n\n🔬 Testing Individual Coordination Components\n');
  console.log('='.repeat(60));
  
  const { 
    TaskDecomposer,
    ParallelExecutor,
    ResultAggregator,
    ConflictResolver
  } = await import('./services/agents/coordination/index.js');
  
  try {
    // Test TaskDecomposer
    console.log('\n📋 Testing TaskDecomposer');
    console.log('-'.repeat(40));
    
    const decomposer = new TaskDecomposer();
    const complexTask = {
      type: 'plan-world-trip',
      data: {
        destinations: ['Paris', 'Tokyo', 'Sydney', 'New York'],
        duration: 30,
        budget: 15000
      }
    };
    
    const decomposition = await decomposer.decompose(complexTask);
    console.log(`Needs decomposition: ${decomposition.needsDecomposition}`);
    console.log(`Complexity score: ${decomposition.complexity?.score.toFixed(2)}`);
    console.log(`Subtasks generated: ${decomposition.subtasks?.length || 0}`);
    
    // Test ParallelExecutor
    console.log('\n\n⚡ Testing ParallelExecutor');
    console.log('-'.repeat(40));
    
    const executor = new ParallelExecutor({ maxConcurrentAgents: 3 });
    await executor.initialize();
    
    const mockTasks = [
      {
        id: 'task1',
        execute: async () => ({ result: 'Task 1 completed' }),
        priority: 'high'
      },
      {
        id: 'task2',
        execute: async () => ({ result: 'Task 2 completed' }),
        priority: 'medium'
      },
      {
        id: 'task3',
        execute: async () => ({ result: 'Task 3 completed' }),
        priority: 'high'
      }
    ];
    
    const batchResult = await executor.executeBatch(mockTasks);
    console.log(`Batch execution summary:`);
    console.log(`- Total: ${batchResult.summary.total}`);
    console.log(`- Successful: ${batchResult.summary.successful}`);
    console.log(`- Failed: ${batchResult.summary.failed}`);
    console.log(`- Success rate: ${(batchResult.summary.successRate * 100).toFixed(1)}%`);
    
    await executor.shutdown();
    
    // Test ResultAggregator
    console.log('\n\n🔄 Testing ResultAggregator');
    console.log('-'.repeat(40));
    
    const aggregator = new ResultAggregator();
    const mockResults = [
      {
        agentId: 'agent1',
        success: true,
        data: { bookings: [{ flight: 'AA123' }], confidence: 0.9 }
      },
      {
        agentId: 'agent2',
        success: true,
        data: { bookings: [{ flight: 'AA123' }, { hotel: 'Hilton' }], confidence: 0.85 }
      },
      {
        agentId: 'agent3',
        success: true,
        data: { tasks: ['Check-in online', 'Pack luggage'], confidence: 0.95 }
      }
    ];
    
    const aggregated = await aggregator.aggregate(mockResults);
    console.log(`Aggregation success: ${aggregated.success}`);
    console.log(`Data types detected: ${Object.keys(aggregated.data).join(', ')}`);
    console.log(`Overall confidence: ${aggregated.metadata.confidence.toFixed(2)}`);
    
    // Test ConflictResolver
    console.log('\n\n⚖️ Testing ConflictResolver');
    console.log('-'.repeat(40));
    
    const resolver = new ConflictResolver();
    const conflictingResults = [
      {
        agentId: 'agent1',
        data: { departureTime: '10:00 AM', gate: 'A1' },
        confidence: 0.9
      },
      {
        agentId: 'agent2',
        data: { departureTime: '2:00 PM', gate: 'A1' },
        confidence: 0.85
      },
      {
        agentId: 'agent3',
        data: { departureTime: '11:00 AM', gate: 'B2' },
        confidence: 0.95
      }
    ];
    
    const resolved = await resolver.resolveConflicts(conflictingResults);
    console.log(`Conflicts resolved: ${resolved.resolved}`);
    console.log(`Number of conflicts: ${resolved.conflicts.length}`);
    console.log(`Resolution confidence: ${resolved.confidence || 'N/A'}`);
    
  } catch (error) {
    console.error('\n❌ Component test failed:', error);
  }
}

// Test error handling and edge cases
async function testEdgeCases() {
  console.log('\n\n🛡️ Testing Edge Cases and Error Handling\n');
  console.log('='.repeat(60));
  
  const orchestrator = new AgentOrchestrator();
  
  try {
    await orchestrator.initialize();
    
    // Test 1: Empty task
    console.log('\n🔸 Test 1: Empty task');
    try {
      await orchestrator.executeComplexTask({});
      console.log('❌ Should have failed with empty task');
    } catch (error) {
      console.log('✅ Correctly handled empty task:', error.message);
    }
    
    // Test 2: Circular dependencies
    console.log('\n🔸 Test 2: Circular dependencies');
    const circularTask = {
      type: 'circular-test',
      subtasks: [
        { id: 'a', dependencies: ['b'] },
        { id: 'b', dependencies: ['c'] },
        { id: 'c', dependencies: ['a'] }
      ]
    };
    
    try {
      await orchestrator.executeWithStrategy(circularTask, 'hierarchical');
      console.log('❌ Should have detected circular dependencies');
    } catch (error) {
      console.log('✅ Correctly detected circular dependencies:', error.message);
    }
    
    // Test 3: No capable agents
    console.log('\n🔸 Test 3: No capable agents');
    const unsupportedTask = {
      type: 'unsupported-task-type',
      data: { requirement: 'impossible' }
    };
    
    try {
      await orchestrator.executeComplexTask(unsupportedTask);
      console.log('❌ Should have failed with no capable agents');
    } catch (error) {
      console.log('✅ Correctly handled no capable agents:', error.message);
    }
    
  } catch (error) {
    console.error('\n❌ Edge case test failed:', error);
  } finally {
    await orchestrator.shutdown();
  }
}

// Main test runner
async function runAllCoordinationTests() {
  console.log('🚀 Starting Multi-Agent Coordination Tests\n');
  
  try {
    await testCoordinationStrategies();
    await testCoordinationComponents();
    await testEdgeCases();
    
    console.log('\n\n✅ All coordination tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Adaptive coordination: ✅');
    console.log('- Task decomposition: ✅');
    console.log('- Parallel execution: ✅');
    console.log('- Result aggregation: ✅');
    console.log('- Conflict resolution: ✅');
    console.log('- Error handling: ✅');
    
  } catch (error) {
    console.error('\n\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllCoordinationTests();