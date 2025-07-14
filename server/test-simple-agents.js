/**
 * Simple test for multi-agent system with mock LLM
 */

import AgentOrchestrator from './services/agents/AgentOrchestrator.js';

async function testSimpleAgent() {
  console.log('🧪 Testing Simple Agent Execution\n');
  
  const orchestrator = new AgentOrchestrator();
  
  try {
    await orchestrator.initialize();
    console.log('✅ Orchestrator initialized\n');
    
    // Test 1: Parse Email
    console.log('📧 Test: Email Parsing');
    const emailTask = {
      type: 'parse-email',
      content: 'Flight booking confirmation for AA123'
    };
    
    const routing = await orchestrator.routeToAgent(emailTask);
    console.log(`Selected agent: ${routing.selectedAgents[0].name}`);
    
    const result = await orchestrator.executeAgentTask(
      routing.selectedAgents[0].id,
      emailTask
    );
    
    console.log('Result:', JSON.stringify(result.result, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await orchestrator.shutdown();
  }
}

// Set mock environment
process.env.USE_MOCK_LLM = 'true';
process.env.MOCK_ENABLED = 'true';
process.env.MOCK_LLM_DELAY = '10';

testSimpleAgent();