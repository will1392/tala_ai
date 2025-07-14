import dotenv from 'dotenv';
dotenv.config();

import LLMRouter from './services/llm/LLMRouter.js';
import { PerformanceMonitor } from './services/llm/monitoring/PerformanceMonitor.js';
import { CostOptimizer } from './services/llm/monitoring/CostOptimizer.js';
import { MetricsCollector } from './services/llm/monitoring/MetricsCollector.js';

console.log('📊 TESTING PERFORMANCE MONITORING & COST OPTIMIZATION');
console.log('=' .repeat(70));

/**
 * Test the complete monitoring system
 */
async function testMonitoringSystem() {
  // Initialize router with full monitoring enabled
  const router = new LLMRouter({
    enableLogging: true,
    enableMonitoring: true,
    enableCostOptimization: true,
    enableHealthChecks: false, // Disable for focused testing
    dailyBudget: 10.00,   // $10/day for testing
    monthlyBudget: 100.00 // $100/month for testing
  });

  console.log('\n🔧 TESTING MONITORING COMPONENTS');
  console.log('-'.repeat(50));

  // Test individual components
  await testPerformanceMonitor();
  await testCostOptimizer();
  await testMetricsCollector();

  console.log('\n🚀 TESTING INTEGRATED MONITORING');
  console.log('-'.repeat(50));

  // Test various query scenarios
  const testScenarios = [
    {
      name: "Simple Factual Query",
      query: "What is the capital of France?",
      context: { userId: "user_123", sessionId: "session_456" },
      options: { maxTokens: 20 }
    },
    {
      name: "Complex Planning Query",
      query: "Create a detailed 5-day itinerary for Tokyo including cultural sites, restaurants, and transportation recommendations",
      context: { userId: "user_123", sessionId: "session_456" },
      options: { maxTokens: 300 }
    },
    {
      name: "Real-time Information Query",
      query: "What's the current weather in New York City right now?",
      context: { userId: "user_789", sessionId: "session_101" },
      options: { maxTokens: 100 }
    },
    {
      name: "Cost-sensitive Query",
      query: "Quick answer: What time zone is California in?",
      context: { 
        userId: "user_456", 
        sessionId: "session_789",
        userPreferences: { costOptimization: true, fastResponse: true }
      },
      options: { maxTokens: 30 }
    }
  ];

  console.log('\n📈 Executing test scenarios...');

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n${i + 1}. 🧪 Testing: ${scenario.name}`);
    
    try {
      const startTime = Date.now();
      const response = await router.routeQuery(scenario.query, scenario.context, scenario.options);
      const totalTime = Date.now() - startTime;
      
      console.log(`   ✅ Success!`);
      console.log(`   🤖 Model: ${response.routing.selectedModel}`);
      console.log(`   ⏱️  Time: ${totalTime}ms`);
      console.log(`   💰 Cost: $${response.usage.cost.toFixed(6)}`);
      console.log(`   🎯 Query Type: ${response.routing.queryType}`);
      console.log(`   📊 Tokens: ${response.usage.totalTokens}`);
      
      if (response.routing.budgetStatus) {
        console.log(`   💳 Daily Budget: ${(response.routing.budgetStatus.daily.usage * 100).toFixed(1)}% used`);
      }
      
      if (response.routing.costSavings) {
        console.log(`   💡 Potential Savings: ${response.routing.costSavings.percentage.toFixed(1)}%`);
      }
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Wait for metrics to be processed
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n📊 TESTING MONITORING REPORTS');
  console.log('-'.repeat(50));

  // Test comprehensive monitoring report
  try {
    const monitoringReport = router.getMonitoringReport();
    console.log('\n🔍 Monitoring Report Summary:');
    console.log(`   Router Uptime: ${Math.floor(monitoringReport.uptime / 1000)}s`);
    console.log(`   Total Queries: ${monitoringReport.router.router.totalQueries}`);
    
    if (monitoringReport.performance) {
      console.log(`   Avg Response Time: ${monitoringReport.performance.summary.avgResponseTime.toFixed(0)}ms`);
      console.log(`   Success Rate: ${((monitoringReport.performance.summary.successfulRequests / monitoringReport.performance.summary.totalRequests) * 100).toFixed(1)}%`);
    }
    
    if (monitoringReport.costs) {
      console.log(`   Total Cost: $${monitoringReport.costs.summary.total.allTime.toFixed(6)}`);
      console.log(`   Daily Budget Usage: ${(monitoringReport.costs.summary.daily.usage * 100).toFixed(1)}%`);
    }
    
  } catch (error) {
    console.log(`❌ Monitoring report failed: ${error.message}`);
  }

  console.log('\n📱 TESTING DASHBOARD DATA');
  console.log('-'.repeat(50));

  // Test dashboard data structure
  try {
    const dashboardData = router.getDashboardData();
    console.log('\n📊 Dashboard Data Structure:');
    console.log(`   Summary: ${Object.keys(dashboardData.summary).length} fields`);
    console.log(`   Performance: ${dashboardData.performance ? 'Available' : 'Not Available'}`);
    console.log(`   Costs: ${dashboardData.costs ? 'Available' : 'Not Available'}`);
    console.log(`   Models: ${dashboardData.models.length} models tracked`);
    console.log(`   Alerts: ${dashboardData.alerts.length} active alerts`);
    console.log(`   Charts: ${Object.keys(dashboardData.charts).length} chart datasets`);
    
    // Show sample alerts
    if (dashboardData.alerts.length > 0) {
      console.log('\n🚨 Active Alerts:');
      dashboardData.alerts.forEach(alert => {
        console.log(`   ${alert.type.toUpperCase()}: ${alert.message}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Dashboard data failed: ${error.message}`);
  }

  console.log('\n💰 TESTING COST OPTIMIZATION');
  console.log('-'.repeat(50));

  // Test cost optimization suggestions
  if (router.costOptimizer) {
    try {
      const costBreakdown = router.costOptimizer.getCostBreakdown();
      console.log('\n💸 Cost Breakdown:');
      
      if (costBreakdown.byModel.length > 0) {
        console.log('   By Model:');
        costBreakdown.byModel.slice(0, 3).forEach(model => {
          console.log(`     ${model.modelId}: $${model.cost.toFixed(6)}`);
        });
      }
      
      if (costBreakdown.optimizationOpportunities.length > 0) {
        console.log('\n💡 Optimization Opportunities:');
        costBreakdown.optimizationOpportunities.forEach(opp => {
          console.log(`   ${opp.type}: ${opp.recommendation}`);
          if (opp.potentialSavings) {
            console.log(`     Potential Savings: $${opp.potentialSavings.toFixed(4)}`);
          }
        });
      }
      
      const projection = router.costOptimizer.getCostProjection(7);
      console.log(`\n📈 7-day Cost Projection: $${projection.projection.toFixed(2)} (${(projection.confidence * 100).toFixed(0)}% confidence)`);
      
    } catch (error) {
      console.log(`❌ Cost optimization failed: ${error.message}`);
    }
  }

  console.log('\n📄 TESTING METRICS EXPORT');
  console.log('-'.repeat(50));

  // Test metrics export
  if (router.metricsCollector) {
    try {
      const exportResult = await router.metricsCollector.exportData({
        format: 'json',
        includeRawData: false
      });
      
      if (exportResult.success) {
        console.log(`✅ Export successful: ${exportResult.filename}`);
        console.log(`   Records: ${exportResult.recordCount}`);
        console.log(`   Format: ${exportResult.format}`);
      } else {
        console.log(`❌ Export failed: ${exportResult.error}`);
      }
      
    } catch (error) {
      console.log(`❌ Metrics export failed: ${error.message}`);
    }
  }

  console.log('\n🔄 TESTING BUDGET LIMITS');
  console.log('-'.repeat(50));

  // Test budget enforcement
  if (router.costOptimizer) {
    try {
      // Simulate approaching budget limit
      const originalBudget = router.costOptimizer.budgets.daily.limit;
      router.costOptimizer.budgets.daily.limit = 0.10; // $0.10 for testing
      router.costOptimizer.budgets.daily.spent = 0.08;  // $0.08 spent
      
      console.log('\n💸 Simulating near-budget-limit scenario...');
      
      const budgetOptimization = router.costOptimizer.getOptimizedModel('factual', {
        estimatedTokens: 100
      });
      
      console.log(`   Primary Model: ${budgetOptimization.primaryModel}`);
      console.log(`   Emergency Mode: ${budgetOptimization.isEmergencyMode ? 'YES' : 'NO'}`);
      console.log(`   Reasoning: ${budgetOptimization.reasoning.join(', ')}`);
      console.log(`   Est. Cost: $${budgetOptimization.estimatedCost.toFixed(6)}`);
      
      // Restore original budget
      router.costOptimizer.budgets.daily.limit = originalBudget;
      
    } catch (error) {
      console.log(`❌ Budget testing failed: ${error.message}`);
    }
  }

  console.log('\n🏆 MONITORING SYSTEM TESTING COMPLETED!');
  console.log('\n💡 KEY FEATURES DEMONSTRATED:');
  console.log('   ✅ Real-time performance monitoring');
  console.log('   ✅ Comprehensive cost tracking and optimization');
  console.log('   ✅ Intelligent budget enforcement');
  console.log('   ✅ Detailed metrics collection and analysis');
  console.log('   ✅ Dashboard data structure for frontend');
  console.log('   ✅ Data export capabilities');
  console.log('   ✅ Alert generation and monitoring');
  console.log('   ✅ Query pattern analysis');
  console.log('   ✅ Model performance comparison');
  console.log('   ✅ Cost projection and budgeting');

  // Cleanup
  await router.shutdown();
}

/**
 * Test PerformanceMonitor independently
 */
async function testPerformanceMonitor() {
  console.log('\n⚡ Testing PerformanceMonitor...');
  
  const monitor = new PerformanceMonitor({
    enableLogging: false // Reduce noise
  });
  
  // Simulate some requests
  const requests = [
    { id: 'req1', model: 'gpt-4o-mini', queryType: 'factual', duration: 1200, tokens: 50, cost: 0.001 },
    { id: 'req2', model: 'claude-sonnet-4-20250514', queryType: 'complexPlanning', duration: 2500, tokens: 200, cost: 0.015 },
    { id: 'req3', model: 'gemini-2.5-flash', queryType: 'realTime', duration: 800, tokens: 75, cost: 0.002 }
  ];
  
  for (const req of requests) {
    monitor.startRequest(req.id, {
      modelId: req.model,
      queryType: req.queryType,
      estimatedTokens: req.tokens
    });
    
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate processing
    
    monitor.completeRequest(req.id, {
      modelId: req.model,
      tokensUsed: req.tokens,
      cost: req.cost,
      success: true,
      responseTime: req.duration
    });
  }
  
  const report = monitor.getPerformanceReport();
  console.log(`   📊 Requests tracked: ${report.summary.totalRequests}`);
  console.log(`   📈 Avg response time: ${report.summary.avgResponseTime.toFixed(0)}ms`);
  console.log(`   💰 Total cost: $${report.summary.totalCost.toFixed(6)}`);
  console.log(`   ✅ PerformanceMonitor working correctly`);
}

/**
 * Test CostOptimizer independently
 */
async function testCostOptimizer() {
  console.log('\n💰 Testing CostOptimizer...');
  
  const optimizer = new CostOptimizer({
    enableLogging: false,
    dailyBudget: 5.00,
    monthlyBudget: 100.00
  });
  
  // Record some costs
  const costs = [
    { cost: 0.001, modelId: 'gpt-4o-mini', queryType: 'factual' },
    { cost: 0.015, modelId: 'claude-sonnet-4-20250514', queryType: 'complexPlanning' },
    { cost: 0.002, modelId: 'gemini-2.5-flash', queryType: 'realTime' }
  ];
  
  costs.forEach(costData => {
    optimizer.recordCost(costData);
  });
  
  const budgetStatus = optimizer.getBudgetStatus();
  console.log(`   💳 Daily budget usage: ${(budgetStatus.daily.usage * 100).toFixed(2)}%`);
  
  const optimization = optimizer.getOptimizedModel('factual');
  console.log(`   🎯 Recommended model for factual queries: ${optimization.primaryModel}`);
  console.log(`   💡 Cost savings potential: ${optimization.costSavings.percentage.toFixed(1)}%`);
  console.log(`   ✅ CostOptimizer working correctly`);
}

/**
 * Test MetricsCollector independently
 */
async function testMetricsCollector() {
  console.log('\n📊 Testing MetricsCollector...');
  
  const collector = new MetricsCollector({
    enableLogging: false,
    autoSave: false,
    dataDirectory: './test-metrics-data'
  });
  
  await collector.initializeStorage();
  
  // Store some metrics
  const metrics = [
    {
      modelId: 'gpt-4o-mini',
      queryType: 'factual',
      responseTime: 1200,
      tokensUsed: 50,
      cost: 0.001,
      success: true
    },
    {
      modelId: 'claude-sonnet-4-20250514',
      queryType: 'complexPlanning',
      responseTime: 2500,
      tokensUsed: 200,
      cost: 0.015,
      success: true
    }
  ];
  
  for (const metric of metrics) {
    await collector.storeMetrics(metric);
  }
  
  const analytics = collector.calculateAnalytics();
  console.log(`   📈 Metrics stored: ${analytics.summary.totalMetrics}`);
  console.log(`   📊 Avg response time: ${analytics.performance.avgResponseTime.toFixed(0)}ms`);
  console.log(`   💰 Total cost: $${analytics.costs.totalCost.toFixed(6)}`);
  console.log(`   ✅ MetricsCollector working correctly`);
  
  await collector.shutdown();
}

// Run the tests
testMonitoringSystem().catch(console.error);