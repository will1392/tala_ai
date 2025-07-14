/**
 * Simple Test Script for Performance Monitoring System
 * Compatible with ES modules and current architecture
 */

import dotenv from 'dotenv';
dotenv.config();

import { PerformanceMonitor } from './services/llm/monitoring/PerformanceMonitor.js';
import { CostOptimizer } from './services/llm/monitoring/CostOptimizer.js';
import { MetricsCollector } from './services/llm/monitoring/MetricsCollector.js';

async function testMonitoring() {
    console.log('🧪 TESTING MONITORING SYSTEM');
    console.log('=' .repeat(40));

    // Initialize components
    const monitor = new PerformanceMonitor({
        enableLogging: false // Reduce noise for testing
    });
    
    const optimizer = new CostOptimizer({
        enableLogging: false,
        dailyBudget: 10.00,
        monthlyBudget: 100.00
    });
    
    const collector = new MetricsCollector({
        enableLogging: false,
        autoSave: false,
        dataDirectory: './test-data'
    });

    await collector.initializeStorage();

    console.log('\n📊 Recording test metrics...');
    
    // Test requests with proper model IDs from your system
    const testRequests = [
        { 
            id: 'test1',
            modelId: 'gpt-4o-mini-2024-07-18', 
            queryType: 'factual',
            tokens: 1000, 
            responseTime: 1200, 
            success: true 
        },
        { 
            id: 'test2',
            modelId: 'claude-sonnet-4-20250514', 
            queryType: 'complexPlanning',
            tokens: 500, 
            responseTime: 800, 
            success: true 
        },
        { 
            id: 'test3',
            modelId: 'gemini-2.5-flash', 
            queryType: 'realTime',
            tokens: 1500, 
            responseTime: 1500, 
            success: true 
        },
        { 
            id: 'test4',
            modelId: 'gpt-4o-mini-2024-07-18', 
            queryType: 'factual',
            tokens: 2000, 
            responseTime: 2000, 
            success: false 
        },
    ];

    // Process each test request
    for (const req of testRequests) {
        // Start request tracking
        monitor.startRequest(req.id, {
            modelId: req.modelId,
            queryType: req.queryType,
            estimatedTokens: req.tokens
        });

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 10));

        // Calculate cost based on model and tokens
        const cost = calculateTestCost(req.modelId, req.tokens);

        // Complete request tracking
        monitor.completeRequest(req.id, {
            modelId: req.modelId,
            tokensUsed: req.tokens,
            cost: cost,
            success: req.success,
            responseTime: req.responseTime
        });

        // Record cost in optimizer
        optimizer.recordCost({
            cost: cost,
            modelId: req.modelId,
            queryType: req.queryType,
            tokensUsed: req.tokens,
            timestamp: Date.now()
        });

        // Store metrics in collector
        await collector.storeMetrics({
            modelId: req.modelId,
            queryType: req.queryType,
            responseTime: req.responseTime,
            tokensUsed: req.tokens,
            cost: cost,
            success: req.success,
            timestamp: Date.now()
        });

        console.log(`   ✓ Processed ${req.modelId} (${req.queryType}): ${req.tokens} tokens, $${cost.toFixed(6)}`);
    }

    console.log('\n📈 PERFORMANCE METRICS:');
    console.log('-'.repeat(30));
    
    // Get performance metrics
    const performanceReport = monitor.getPerformanceReport();
    console.log(`   Total Requests: ${performanceReport.summary.totalRequests}`);
    console.log(`   Successful Requests: ${performanceReport.summary.successfulRequests}`);
    console.log(`   Average Response Time: ${performanceReport.summary.avgResponseTime.toFixed(0)}ms`);
    console.log(`   Total Cost: $${performanceReport.summary.totalCost.toFixed(6)}`);
    console.log(`   Success Rate: ${((performanceReport.summary.successfulRequests / performanceReport.summary.totalRequests) * 100).toFixed(1)}%`);

    console.log('\n💰 COST OPTIMIZATION:');
    console.log('-'.repeat(30));
    
    // Get cost status
    const budgetStatus = optimizer.getBudgetStatus();
    console.log(`   Daily Budget Usage: ${(budgetStatus.daily.usage * 100).toFixed(2)}%`);
    console.log(`   Monthly Budget Usage: ${(budgetStatus.monthly.usage * 100).toFixed(2)}%`);
    
    const costBreakdown = optimizer.getCostBreakdown();
    console.log(`   Total Spent: $${costBreakdown.summary.total.allTime.toFixed(6)}`);
    
    if (costBreakdown.byModel.length > 0) {
        console.log('   Cost by Model:');
        costBreakdown.byModel.forEach(model => {
            console.log(`     ${model.modelId}: $${model.cost.toFixed(6)}`);
        });
    }

    console.log('\n📊 ANALYTICS:');
    console.log('-'.repeat(30));
    
    // Get analytics from collector
    const analytics = collector.calculateAnalytics();
    console.log(`   Stored Metrics: ${analytics.summary.totalMetrics}`);
    console.log(`   Average Cost per Query: $${analytics.costs.avgCostPerQuery.toFixed(6)}`);
    console.log(`   Most Used Query Type: ${Object.keys(analytics.usage.queryTypeDistribution)[0] || 'N/A'}`);

    console.log('\n🔍 MODEL COMPARISON:');
    console.log('-'.repeat(30));
    
    // Compare models
    const modelComparison = monitor.compareModels();
    if (modelComparison.length > 0) {
        modelComparison.forEach(model => {
            console.log(`   ${model.modelId}:`);
            console.log(`     Requests: ${model.requests}`);
            console.log(`     Avg Response Time: ${model.avgResponseTime.toFixed(0)}ms`);
            console.log(`     Success Rate: ${model.successRate.toFixed(1)}%`);
        });
    }

    console.log('\n🎯 OPTIMIZATION RECOMMENDATIONS:');
    console.log('-'.repeat(30));
    
    // Get optimization suggestions
    const factualOptimization = optimizer.getOptimizedModel('factual');
    console.log(`   Best model for factual queries: ${factualOptimization.primaryModel}`);
    console.log(`   Potential savings: ${factualOptimization.costSavings.percentage.toFixed(1)}%`);

    console.log('\n📤 DATA EXPORT TEST:');
    console.log('-'.repeat(30));
    
    // Test data export
    const exportResult = await collector.exportData({
        format: 'json',
        includeRawData: false
    });
    
    if (exportResult.success) {
        console.log(`   ✅ Export successful: ${exportResult.filename}`);
        console.log(`   Records exported: ${exportResult.recordCount}`);
    } else {
        console.log(`   ❌ Export failed: ${exportResult.error}`);
    }

    console.log('\n🌐 API ENDPOINT INFORMATION:');
    console.log('-'.repeat(30));
    console.log('   Available endpoints:');
    console.log('   GET  /api/llm/metrics                    - Comprehensive metrics');
    console.log('   GET  /api/llm/metrics/performance        - Performance data');
    console.log('   GET  /api/llm/metrics/costs              - Cost analytics');
    console.log('   GET  /api/llm/metrics/health             - Service health');
    console.log('   POST /api/llm/metrics/export             - Export data');
    console.log('   PUT  /api/llm/metrics/budget             - Update budgets');
    console.log('');
    console.log('   Test with: curl http://localhost:3001/api/llm/metrics');
    console.log('   Or with:   curl http://localhost:3001/api/llm/metrics/sample');

    console.log('\n✅ MONITORING SYSTEM TEST COMPLETED!');
    
    // Cleanup
    await collector.shutdown();
}

/**
 * Calculate test cost based on model and tokens
 * Uses simplified pricing for testing
 */
function calculateTestCost(modelId, tokens) {
    const pricing = {
        'gpt-4o-mini-2024-07-18': { input: 0.00015, output: 0.0006 },
        'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
        'gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
        'grok-3': { input: 0.005, output: 0.005 }
    };

    const model = pricing[modelId] || pricing['gpt-4o-mini-2024-07-18'];
    const inputTokens = Math.floor(tokens * 0.7); // Assume 70% input
    const outputTokens = tokens - inputTokens;
    
    return (inputTokens / 1000000 * model.input) + (outputTokens / 1000000 * model.output);
}

// Run the test
testMonitoring().catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
});