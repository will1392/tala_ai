#!/usr/bin/env node

/**
 * Trace the response flow to find where it's being lost
 */

import { cmoChatHandler } from './services/cmo/CMOChatHandler.js';
import { cmoAssistant } from './services/cmo/CMOAssistant.js';
import marketingAgentRouter from './services/agents/MarketingAgentRouter.js';
import { DirectMailAgent } from './services/cmo/agents/specialized/DirectMailAgent.js';

console.log('🔍 Tracing Response Flow\n');

// Test message that should trigger DirectMailAgent
const testMessage = 'I want to target new clients who might be interested in river cruising';
const conversationHistory = [
  { role: 'user', content: 'can you help me with a postcard campaign?' },
  { role: 'assistant', content: 'I\'d love to help you create a successful postcard campaign! 😊\n\nTo give you the best guidance, could you tell me what you\'re hoping to accomplish?' }
];

async function traceDirectMailAgent() {
  console.log('1️⃣ Testing DirectMailAgent directly');
  console.log('=====================================\n');
  
  const agent = new DirectMailAgent();
  const agentInput = {
    query: testMessage,
    conversationHistory,
    expertise: { overall_level: 'beginner' }
  };
  
  const agentResponse = await agent.execute(agentInput);
  console.log('DirectMailAgent Response:');
  console.log('- Status:', agentResponse.status);
  console.log('- Type:', agentResponse.type);
  console.log('- Has content.text:', !!agentResponse.content?.text);
  console.log('- Content preview:', agentResponse.content?.text?.substring(0, 100) + '...');
  console.log('- Full response structure:', JSON.stringify(agentResponse, null, 2).substring(0, 500) + '...');
  
  return agentResponse;
}

async function traceMarketingAgentRouter() {
  console.log('\n2️⃣ Testing MarketingAgentRouter');
  console.log('=================================\n');
  
  const routerContext = {
    detectedChannel: 'direct_mail',
    conversationHistory,
    expertise: 'beginner'
  };
  
  const routerResponse = await marketingAgentRouter.route(testMessage, routerContext);
  console.log('MarketingAgentRouter Response:');
  console.log('- Type:', routerResponse?.type);
  console.log('- Agent:', routerResponse?.agent);
  console.log('- Has content:', !!routerResponse?.content);
  console.log('- Content type:', typeof routerResponse?.content);
  console.log('- Content.text preview:', routerResponse?.content?.text?.substring(0, 100) + '...');
  console.log('- Full structure:', JSON.stringify(routerResponse, null, 2).substring(0, 500) + '...');
  
  return routerResponse;
}

async function traceCMOAssistant() {
  console.log('\n3️⃣ Testing CMOAssistant');
  console.log('========================\n');
  
  const assistantResponse = await cmoAssistant.processQuery(testMessage, {
    userId: 'test-user',
    subMode: 'direct_mail',
    conversationHistory,
    conversationId: 'test-123'
  });
  
  console.log('CMOAssistant Response:');
  console.log('- Has content:', !!assistantResponse?.content);
  console.log('- Content type:', typeof assistantResponse?.content);
  console.log('- Content preview:', (assistantResponse?.content || '').substring(0, 100) + '...');
  console.log('- Response type:', assistantResponse?.type);
  console.log('- Keys:', Object.keys(assistantResponse || {}));
  
  return assistantResponse;
}

async function traceCMOChatHandler() {
  console.log('\n4️⃣ Testing CMOChatHandler');
  console.log('==========================\n');
  
  const handlerResponse = await cmoChatHandler.processMessage(testMessage, {
    conversationId: 'test-123',
    userId: 'test-user',
    subMode: 'direct_mail',
    conversationHistory
  });
  
  console.log('CMOChatHandler Response:');
  console.log('- Mode:', handlerResponse?.mode);
  console.log('- SubMode:', handlerResponse?.subMode);
  console.log('- Has response:', !!handlerResponse?.response);
  console.log('- Response preview:', (handlerResponse?.response || '').substring(0, 100) + '...');
  console.log('- Is echoing:', handlerResponse?.response?.includes(testMessage));
  
  return handlerResponse;
}

// Run all traces
async function runTraces() {
  try {
    console.log('🚀 Starting Response Flow Trace');
    console.log('Message:', testMessage);
    console.log('History:', conversationHistory.length, 'messages\n');
    
    await traceDirectMailAgent();
    await traceMarketingAgentRouter();
    await traceCMOAssistant();
    await traceCMOChatHandler();
    
    console.log('\n✅ Trace complete!');
    
  } catch (error) {
    console.error('\n❌ Error during trace:', error.message);
    console.error(error.stack);
  }
}

runTraces();