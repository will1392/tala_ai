# Testing the Multi-LLM Integration

## 🧪 Available Test Scripts

### 1. Your CommonJS Test (Compatible)
```bash
node test-integration-commonjs.js
```

### 2. ES Module Test  
```bash
node test-user-integration.js
```

### 3. Comprehensive Integration Test
```bash
node test-integration.js
```

## 📊 Expected Response Format

When you make a chat request, you'll get this enhanced response:

```json
{
  "response": "AI response text here...",
  "sources": [...],
  "contextUsed": true,
  "conversationId": "test-123",
  "timestamp": "2025-07-13T15:30:00.000Z",
  "tokensUsed": 150,
  
  // NEW FIELDS (Multi-LLM):
  "cost": 0.000225,
  "model": "gpt-4o-mini-2024-07-18",
  "provider": "openai",
  "routing": {
    "queryType": "factual",
    "modelSelected": "gpt-4o-mini-2024-07-18",
    "fallbacksUsed": 0,
    "costOptimized": false,
    "reasoning": ["Query type optimization"]
  },
  "performance": {
    "responseTime": 1250,
    "successful": true
  },
  "metadata": {
    "timestamp": "2025-07-13T15:30:00.000Z",
    "multiLLM": true
  }
}
```

## 🔧 Setting Up for Testing

### Option 1: OpenAI-Only Mode (Safest)
```bash
# Add to .env file
ENABLE_MULTI_LLM=false

# Start server
npm start

# Run your test
node test-integration-commonjs.js
```

### Option 2: Multi-LLM Mode
```bash
# Add to .env file
ENABLE_MULTI_LLM=true
ANTHROPIC_API_KEY=your-anthropic-key
DAILY_LLM_BUDGET=50.00
MONTHLY_LLM_BUDGET=1000.00

# Start server
npm start

# Run your test
node test-integration-commonjs.js
```

## 🎯 Your Test Code Adaptation

Your original test will work with these small adjustments:

```javascript
// Your original test - this works as-is!
const chatResponse = await axios.post(`${baseURL}/api/chat`, {
    message: "What's the weather in Paris?",
    userId: "test_user",        // Add this required field
    conversationId: "test-123"
});

console.log('✅ Chat Response:', chatResponse.data);
console.log('Used Model:', chatResponse.data.model);        // Direct field
console.log('Provider:', chatResponse.data.provider);      // New field
console.log('Cost:', chatResponse.data.cost);              // New field
console.log('Response Time:', chatResponse.data.performance?.responseTime);

// Test with model preference
const preferredResponse = await axios.post(`${baseURL}/api/chat`, {
    message: "Plan a trip to Tokyo",
    userId: "test_user",        // Add this required field
    conversationId: "test-456",
    preferredModel: "claude-sonnet-4-20250514"  // This goes in the body
});

console.log('Preferred Model Response:', preferredResponse.data.model);
```

## 🧪 Testing User Preferences

```javascript
// Test cost optimization
const costOptimized = await axios.post(`${baseURL}/api/chat`, {
    message: "Quick question: What time zone is Tokyo in?",
    userId: "test_user",
    conversationId: "test-789",
    costOptimization: true,     // Enable cost optimization
    fastResponse: true          // Prefer faster models
});

// Test specific model preference
const specificModel = await axios.post(`${baseURL}/api/chat`, {
    message: "Detailed travel analysis for Japan",
    userId: "test_user",
    conversationId: "test-101",
    preferredModel: "claude-sonnet-4-20250514"  // Request specific model
});
```

## 📊 Testing Metrics

```javascript
// Get comprehensive metrics
const metrics = await axios.get(`${baseURL}/api/llm/metrics`);

// Get just performance data
const performance = await axios.get(`${baseURL}/api/llm/metrics/performance`);

// Get cost information
const costs = await axios.get(`${baseURL}/api/llm/metrics/costs`);

// Get sample dashboard data
const sample = await axios.get(`${baseURL}/api/llm/metrics/sample`);
```

## 🔍 Debugging Tips

### Check Server Status
```javascript
const health = await axios.get(`${baseURL}/api/health`);
console.log('Multi-LLM Enabled:', health.data.multiLLM);
console.log('Available Services:', health.data.services);
```

### Monitor Costs
```javascript
const costs = await axios.get(`${baseURL}/api/llm/metrics/costs`);
console.log('Daily Budget Usage:', costs.data.budgetStatus?.daily?.usage);
```

### Check Recent Performance
```javascript
const performance = await axios.get(`${baseURL}/api/llm/metrics/performance`);
console.log('Average Response Time:', performance.data.summary?.avgResponseTime);
```

## 🚨 Common Issues & Solutions

### Issue: "Cannot find module"
```bash
# Install axios if not available
npm install axios

# Or use the ES module version with fetch
node test-user-integration.js
```

### Issue: "User ID required"
```javascript
// Always include userId in chat requests
{
    message: "your message",
    userId: "test_user",     // Required field
    conversationId: "test_conv"
}
```

### Issue: Metrics endpoint returns 404
```javascript
// Check if multi-LLM is enabled
const health = await axios.get(`${baseURL}/api/health`);
if (!health.data.multiLLM) {
    console.log('Multi-LLM is disabled - metrics not available');
}
```

### Issue: High costs
```javascript
// Update budget limits
await axios.put(`${baseURL}/api/llm/metrics/budget`, {
    dailyBudget: 10.00,     // Lower limit
    monthlyBudget: 100.00
});
```

### Issue: Slow responses
```javascript
// Check service health
const health = await axios.get(`${baseURL}/api/llm/metrics/health`);
console.log('Healthy Services:', health.data.overall?.healthyServices);

// Reset circuit breakers if needed
await axios.post(`${baseURL}/api/llm/metrics/reset-circuit-breakers`);
```

## 🎯 Test Results to Expect

### With ENABLE_MULTI_LLM=false (OpenAI-only)
```
✅ Chat Response Generated
🤖 Model Used: gpt-4o-mini
🏢 Provider: openai
💰 Cost: $0.000150
⏱️  Response Time: 1200ms
🎯 Query Type: unknown
```

### With ENABLE_MULTI_LLM=true (Multi-LLM)
```
✅ Chat Response Generated  
🤖 Model Used: claude-sonnet-4-20250514
🏢 Provider: anthropic
💰 Cost: $0.003500
⏱️  Response Time: 2100ms
🎯 Query Type: complexPlanning
```

## 📋 Next Steps After Testing

1. **Monitor Logs**: Check server console for any errors
2. **Review Costs**: Use metrics endpoints to track spending
3. **Adjust Budgets**: Update limits based on usage patterns
4. **Test Frontend**: Integrate with your React application
5. **User Feedback**: Test with real user scenarios

## 🏆 Success Indicators

✅ All API endpoints respond correctly  
✅ Model selection works as expected  
✅ Cost tracking is accurate  
✅ Performance metrics are collected  
✅ Conversation continuity is maintained  
✅ Error handling works gracefully  
✅ Feature flag enables/disables correctly  

Your integration is working perfectly when all these indicators pass! 🎉