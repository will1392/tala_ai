/**
 * Test Multi-Agent Orchestration System
 * 
 * Demonstrates the capabilities of the multi-agent system with various travel scenarios
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load test environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.test') });

import AgentOrchestrator from './services/agents/AgentOrchestrator.js';

// Sample test data
const testScenarios = {
  emailBooking: {
    type: 'parse-email',
    source: 'email',
    content: `
      Subject: Your Flight Booking Confirmation - AA1234
      
      Dear John Smith,
      
      Thank you for booking with American Airlines. Your flight details are confirmed:
      
      Booking Reference: ABC123
      Flight: AA1234
      Route: New York (JFK) to London (LHR)
      Date: June 15, 2025
      Departure: 10:30 PM (Terminal 8, Gate 42)
      Arrival: 10:15 AM +1 day (Terminal 3)
      Class: Economy
      Seat: 24A
      
      Total Paid: $856.00
      
      Important: Please arrive at least 3 hours before international departure.
      Online check-in opens 24 hours before departure.
      
      Baggage Allowance: 1 checked bag (23kg), 1 carry-on
      
      Contact: support@aa.com or call 1-800-433-7300
    `
  },

  itineraryRequest: {
    type: 'build-itinerary',
    data: {
      destinations: ['Paris', 'Rome', 'Barcelona'],
      dates: { start: '2025-07-01', end: '2025-07-14' },
      travelers: 2,
      budget: 5000,
      preferences: {
        pace: 'moderate',
        interests: ['culture', 'food', 'history'],
        accommodation: 'mid-range hotels'
      }
    }
  },

  passportDocument: {
    type: 'analyze-document',
    data: {
      documentType: 'passport',
      content: `
        UNITED STATES OF AMERICA
        PASSPORT
        
        Type: P
        Code: USA
        Passport No: 123456789
        
        Surname: SMITH
        Given Names: JOHN MICHAEL
        Nationality: UNITED STATES OF AMERICA
        Date of birth: 15 MAR 1985
        Sex: M
        Place of birth: NEW YORK, USA
        Date of issue: 20 JAN 2020
        Date of expiry: 19 JAN 2030
        Authority: DEPARTMENT OF STATE
        
        P<USASMITH<<JOHN<MICHAEL<<<<<<<<<<<<<<<<<<<
        1234567890USA8503155M3001197<<<<<<<<<<<<<<06
      `
    }
  },

  conversationTasks: {
    type: 'extract-tasks',
    data: {
      conversation: [
        { role: 'user', content: "I need to plan a trip to Japan in April. My passport expires in May 2025." },
        { role: 'assistant', content: "I'll help you plan your Japan trip. First, we need to address your passport - it expires in May 2025, which is only a month after your travel." },
        { role: 'user', content: "Oh, I didn't realize that was a problem. What should I do?" },
        { role: 'assistant', content: "You should renew your passport immediately. Japan requires at least 6 months validity. Also, you'll need to book flights soon for better prices, research visa requirements, and we should start planning your itinerary." },
        { role: 'user', content: "Okay, please help me with all of that. My budget is around $3000 per person and we're two people traveling." }
      ]
    }
  },

  complexMultiAgent: {
    type: 'comprehensive-travel-planning',
    requiresMultipleAgents: true,
    data: {
      email: `
        Booking Confirmation
        Your upcoming trip to Europe is confirmed!
        
        Flight: UA921 - San Francisco to Paris
        Date: August 1, 2025
        Confirmation: XYZ789
        
        Please ensure your passport is valid for at least 6 months.
        Check visa requirements for all destinations.
      `,
      destinations: ['Paris', 'Amsterdam', 'Prague'],
      travelDates: { start: '2025-08-01', end: '2025-08-15' },
      additionalRequests: 'Need to find vegetarian restaurants and arrange museum tickets'
    }
  }
};

// Test orchestrator functionality
async function testOrchestrator() {
  console.log('🧪 Testing Multi-Agent Orchestration System\n');
  console.log('=' .repeat(60));
  
  const orchestrator = new AgentOrchestrator({
    performanceTracking: true,
    maxConcurrentAgents: 3
  });
  
  try {
    // Initialize orchestrator
    await orchestrator.initialize();
    console.log('\n✅ Orchestrator initialized successfully\n');
    
    // Test 1: Email Parsing
    console.log('\n📧 Test 1: Email Booking Extraction');
    console.log('-'.repeat(40));
    
    const emailTask = testScenarios.emailBooking;
    const emailRouting = await orchestrator.routeToAgent(emailTask);
    console.log(`Routing decision: ${emailRouting.strategy}`);
    console.log(`Selected agent: ${emailRouting.selectedAgents[0].name}`);
    
    const emailResult = await orchestrator.executeAgentTask(
      emailRouting.selectedAgents[0].id,
      emailTask
    );
    
    console.log('\nExtracted booking details:');
    console.log(JSON.stringify(emailResult.result.bookingDetails, null, 2));
    
    // Test 2: Itinerary Building
    console.log('\n\n✈️ Test 2: Multi-City Itinerary Building');
    console.log('-'.repeat(40));
    
    const itineraryTask = testScenarios.itineraryRequest;
    const itineraryRouting = await orchestrator.routeToAgent(itineraryTask);
    console.log(`Selected agent: ${itineraryRouting.selectedAgents[0].name}`);
    
    const itineraryResult = await orchestrator.executeAgentTask(
      itineraryRouting.selectedAgents[0].id,
      itineraryTask
    );
    
    console.log('\nItinerary overview:');
    console.log(`Total days: ${itineraryResult.result.itinerary.overview.totalDays}`);
    console.log(`Destinations: ${itineraryResult.result.itinerary.overview.destinations.join(' → ')}`);
    console.log(`Estimated cost: $${itineraryResult.result.itinerary.overview.totalCost}`);
    
    // Test 3: Document Analysis
    console.log('\n\n📄 Test 3: Passport Document Analysis');
    console.log('-'.repeat(40));
    
    const documentTask = testScenarios.passportDocument;
    const documentRouting = await orchestrator.routeToAgent(documentTask);
    console.log(`Selected agent: ${documentRouting.selectedAgents[0].name}`);
    
    const documentResult = await orchestrator.executeAgentTask(
      documentRouting.selectedAgents[0].id,
      documentTask
    );
    
    console.log('\nPassport analysis:');
    console.log(`Name: ${documentResult.result.passportData.surname}, ${documentResult.result.passportData.givenNames}`);
    console.log(`Expiry: ${documentResult.result.passportData.dateOfExpiry}`);
    console.log(`Status: ${documentResult.result.expiryStatus.status}`);
    
    // Test 4: Task Extraction
    console.log('\n\n📝 Test 4: Task Extraction from Conversation');
    console.log('-'.repeat(40));
    
    const taskExtractionTask = testScenarios.conversationTasks;
    const taskRouting = await orchestrator.routeToAgent(taskExtractionTask);
    console.log(`Selected agent: ${taskRouting.selectedAgents[0].name}`);
    
    const taskResult = await orchestrator.executeAgentTask(
      taskRouting.selectedAgents[0].id,
      taskExtractionTask
    );
    
    console.log('\nExtracted tasks:');
    taskResult.result.tasks.forEach((task, index) => {
      console.log(`${index + 1}. [${task.priority.toUpperCase()}] ${task.description}`);
      if (task.deadline) {
        console.log(`   Deadline: ${new Date(task.deadline).toLocaleDateString()}`);
      }
    });
    
    // Test 5: Multi-Agent Collaboration
    console.log('\n\n🤝 Test 5: Multi-Agent Collaboration');
    console.log('-'.repeat(40));
    
    const complexTask = testScenarios.complexMultiAgent;
    const complexRouting = await orchestrator.routeToAgent(complexTask);
    console.log(`Strategy: ${complexRouting.strategy}`);
    console.log(`Agents involved: ${complexRouting.selectedAgents.map(a => a.name).join(', ')}`);
    
    // Execute with multiple agents
    const agentResults = await Promise.all(
      complexRouting.selectedAgents.slice(0, 2).map(agent =>
        orchestrator.executeAgentTask(agent.id, {
          ...complexTask,
          type: agent.id === 'email-monitor' ? 'parse-email' : 'extract-tasks',
          content: complexTask.data.email
        })
      )
    );
    
    // Combine results
    const combinedResult = await orchestrator.combineAgentResults(agentResults);
    console.log('\nCombined analysis complete');
    console.log(`Confidence: ${(combinedResult.metadata.confidence * 100).toFixed(1)}%`);
    console.log(`Agents used: ${combinedResult.metadata.agents.length}`);
    
    // Performance Report
    console.log('\n\n📊 Performance Report');
    console.log('-'.repeat(40));
    
    const performanceReport = orchestrator.generatePerformanceReport();
    console.log(`Total agents: ${performanceReport.totalAgents}`);
    console.log(`Active executions: ${performanceReport.activeExecutions}`);
    console.log('\nAgent performance:');
    performanceReport.agents.forEach(agent => {
      console.log(`  ${agent.id}: ${agent.executions} executions, ${(agent.successRate * 100).toFixed(1)}% success, ${agent.avgTime.toFixed(0)}ms avg`);
    });
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    // Shutdown
    await orchestrator.shutdown();
    console.log('\n\n✅ Test completed - Orchestrator shut down');
  }
}

// Run specific agent tests
async function testIndividualAgents() {
  console.log('\n\n🔬 Testing Individual Agent Capabilities\n');
  console.log('=' .repeat(60));
  
  const orchestrator = new AgentOrchestrator();
  await orchestrator.initialize();
  
  try {
    // Get registry statistics
    const stats = orchestrator.registry.getStatistics();
    console.log('\nRegistry Statistics:');
    console.log(`Total agents registered: ${stats.totalAgents}`);
    console.log(`Active instances: ${stats.activeInstances}`);
    console.log(`Available capabilities: ${stats.capabilities}`);
    
    // List all agents
    console.log('\n\nRegistered Agents:');
    const agentList = orchestrator.registry.listAgents();
    agentList.forEach(agent => {
      console.log(`\n${agent.id}:`);
      console.log(`  Name: ${agent.config.name}`);
      console.log(`  LLM: ${agent.config.llm}`);
      console.log(`  Specialization: ${agent.config.specialization}`);
      console.log(`  Capabilities: ${agent.config.capabilities.length}`);
    });
    
    // Test capability search
    console.log('\n\nAgents by Capability:');
    const emailAgents = await orchestrator.registry.findAgentsByCapability('email-parsing');
    console.log(`Email parsing agents: ${emailAgents.map(a => a.name).join(', ')}`);
    
    const planningAgents = await orchestrator.registry.findAgentsByCapability('itinerary-creation');
    console.log(`Itinerary planning agents: ${planningAgents.map(a => a.name).join(', ')}`);
    
  } catch (error) {
    console.error('\n❌ Individual agent test failed:', error);
  } finally {
    await orchestrator.shutdown();
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Multi-Agent System Tests\n');
  
  try {
    await testOrchestrator();
    await testIndividualAgents();
    
    console.log('\n\n✅ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});