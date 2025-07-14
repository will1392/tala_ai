# Multi-LLM Architecture Migration Guide

## Overview

This guide walks through migrating Tala AI from OpenAI-only to the new Multi-LLM architecture with intelligent routing, cost optimization, and performance monitoring.

## 🔧 Environment Variables

### Required New Variables

Add these to your `.env` file:

```bash
# Multi-LLM Feature Flag
ENABLE_MULTI_LLM=true                    # Set to 'false' to use OpenAI-only mode

# LLM Provider API Keys
ANTHROPIC_API_KEY=your_anthropic_key     # For Claude models
GOOGLE_AI_API_KEY=your_google_key        # For Gemini models  
GROK_API_KEY=your_grok_key              # For Grok models

# Budget Management
DAILY_LLM_BUDGET=50.00                   # Daily spending limit in USD
MONTHLY_LLM_BUDGET=1000.00               # Monthly spending limit in USD

# Model Configuration (Optional)
LLM_FALLBACK_CHAIN=gpt-4o-mini,claude-sonnet-4-20250514,gemini-2.5-flash,grok-3-latest
```

### Existing Variables (Still Required)

```bash
# OpenAI (Required for fallback even in multi-LLM mode)
OPENAI_API_KEY=your_openai_key

# Qdrant Vector Database
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key

# Server Configuration
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

## 🚀 Migration Steps

### Step 1: Backup Current Configuration

```bash
# Backup your current .env file
cp .env .env.backup

# Backup server.js (already done automatically)
cp server.js server.js.backup
```

### Step 2: Update Environment Variables

1. Add the new environment variables to your `.env` file
2. Obtain API keys from the providers you want to use:
   - **Anthropic**: https://console.anthropic.com/
   - **Google AI**: https://aistudio.google.com/app/apikey
   - **Grok**: https://console.grok-ai.com/ (when available)

### Step 3: Install Dependencies (if needed)

The migration uses existing dependencies. No additional packages required.

### Step 4: Test the Migration

#### Option A: Start with Multi-LLM Disabled (Safest)

```bash
# In .env file
ENABLE_MULTI_LLM=false

# Start the server
npm start
```

This should work exactly like before. Test your existing chat functionality.

#### Option B: Enable Multi-LLM Gradually

```bash
# In .env file
ENABLE_MULTI_LLM=true

# Start with just OpenAI and one other provider
ANTHROPIC_API_KEY=your_key_here
# Leave others commented out initially

# Start the server
npm start
```

### Step 5: Verify Migration

#### Check Health Endpoint

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-13T15:30:00.000Z",
  "multiLLM": true,
  "services": {
    "openai": true,
    "anthropic": true,
    "google": false,
    "grok": false
  },
  "llmRouter": {
    "uptime": 300000,
    "totalQueries": 0,
    "healthyServices": 2,
    "totalServices": 2
  },
  "chatService": {
    "multiLLM": true,
    "healthy": true
  }
}
```

#### Test Chat Endpoint

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What documents do I need for travel to Japan?",
    "userId": "test_user",
    "conversationId": "test_conv_001"
  }'
```

Look for new fields in the response:
- `model`: Which model was used
- `provider`: Which provider (openai, anthropic, etc.)
- `routing`: Routing decision details
- `cost`: Request cost
- `performance`: Response time metrics

#### Test Metrics Endpoint (Multi-LLM only)

```bash
curl http://localhost:3001/api/llm/metrics/sample
```

## 📊 Monitoring and Performance

### Available Metrics Endpoints

```bash
# Comprehensive dashboard data
GET /api/llm/metrics

# Performance metrics only
GET /api/llm/metrics/performance

# Cost analytics
GET /api/llm/metrics/costs

# Service health
GET /api/llm/metrics/health

# Current alerts
GET /api/llm/metrics/alerts

# Sample data for development
GET /api/llm/metrics/sample
```

### Budget Management

#### Update Budget Limits

```bash
curl -X PUT http://localhost:3001/api/llm/metrics/budget \
  -H "Content-Type: application/json" \
  -d '{
    "dailyBudget": 75.00,
    "monthlyBudget": 1500.00
  }'
```

#### Check Budget Status

```bash
curl http://localhost:3001/api/llm/metrics/costs
```

### Performance Monitoring

```bash
# Get comprehensive performance report
curl http://localhost:3001/api/llm/metrics/performance

# Export metrics data
curl -X POST http://localhost:3001/api/llm/metrics/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "timeRange": 86400000,
    "includeRawData": false
  }'
```

## 🧪 Testing Procedures

### Basic Functionality Test

```bash
# Test script provided
node test-monitoring-simple.js
```

### Load Testing

```bash
# Send multiple requests to test routing
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/chat \
    -H "Content-Type: application/json" \
    -d "{
      \"message\": \"Test message $i\",
      \"userId\": \"load_test_user\",
      \"conversationId\": \"load_test_conv\"
    }" &
done
wait
```

### Model Preference Testing

```bash
# Test cost optimization preference
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quick question: What time zone is Tokyo in?",
    "userId": "test_user",
    "costOptimization": true,
    "fastResponse": true
  }'

# Test specific model preference
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Detailed travel itinerary for Tokyo",
    "userId": "test_user", 
    "preferredModel": "claude-sonnet-4-20250514"
  }'
```

## 🔄 Rollback Procedure

If you need to rollback to OpenAI-only mode:

### Quick Rollback (Immediate)

```bash
# Set in .env file
ENABLE_MULTI_LLM=false

# Restart server
npm restart
```

The system will automatically fall back to OpenAI-only mode while preserving all existing functionality.

### Full Rollback (If Issues Persist)

```bash
# Stop the server
npm stop

# Restore backup
cp server.js.backup server.js
cp .env.backup .env

# Start server
npm start
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "Cannot find package" errors
```bash
# Reinstall dependencies
npm install
```

#### 2. API Key errors
```bash
# Check your .env file
cat .env | grep API_KEY

# Verify API keys are valid
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"test"}],"max_tokens":5}'
```

#### 3. High costs
```bash
# Check budget status
curl http://localhost:3001/api/llm/metrics/costs

# Reduce budget limits
curl -X PUT http://localhost:3001/api/llm/metrics/budget \
  -H "Content-Type: application/json" \
  -d '{"dailyBudget": 10.00}'
```

#### 4. Slow responses
```bash
# Check service health
curl http://localhost:3001/api/llm/metrics/health

# Reset circuit breakers if needed
curl -X POST http://localhost:3001/api/llm/metrics/reset-circuit-breakers
```

### Debug Mode

Enable detailed logging:
```bash
# In .env file
DEBUG=true

# Or set environment variable
DEBUG=true npm start
```

### Health Checks

The system automatically performs health checks every 5 minutes. Monitor the logs for:
```
[LLMRouter INFO] Health check completed: 3/4 services healthy
[PerformanceMonitor INFO] Average response time: 1200ms
[CostOptimizer INFO] Daily budget usage: 45%
```

## 📈 Performance Optimization

### Model Selection Strategy

The system automatically selects models based on:
1. **Query Type**: Factual → cheaper models, Complex → premium models
2. **User Preferences**: Cost optimization, speed preferences
3. **Budget Status**: Switches to cheaper models near budget limits
4. **Model Health**: Avoids unhealthy services

### Cost Optimization

1. **Budget Limits**: Hard stops at 95% of budget
2. **Warning Thresholds**: Alerts at 80% of budget
3. **Smart Routing**: Automatically uses cheaper models for simple queries
4. **Usage Patterns**: Learns from usage to optimize future routing

### Performance Tuning

1. **Circuit Breakers**: Automatically disable failing services
2. **Fallback Chains**: Multiple backup options for reliability
3. **Response Caching**: Consider implementing for repeated queries
4. **Load Balancing**: Distributes load across healthy services

## 🎯 Next Steps

### Immediate
1. Monitor metrics daily for the first week
2. Adjust budget limits based on actual usage
3. Review cost breakdown and optimize model selection

### Medium Term
1. Implement user-specific model preferences
2. Add custom routing rules for specific use cases
3. Integrate with business intelligence tools

### Long Term
1. Add more LLM providers as they become available
2. Implement advanced cost optimization algorithms
3. Add predictive analytics for cost forecasting

## 📞 Support

If you encounter issues during migration:

1. **Check Logs**: Look for error messages in the console
2. **Health Check**: Use `/api/health` endpoint
3. **Rollback**: Use the rollback procedure if needed
4. **Documentation**: Review this guide and the code comments

## 📝 Change Log

### New Features Added
- ✅ Multi-LLM routing with intelligent model selection
- ✅ Real-time cost tracking and budget enforcement
- ✅ Performance monitoring and analytics
- ✅ Comprehensive metrics dashboard API
- ✅ Circuit breaker pattern for reliability
- ✅ Graceful fallback to OpenAI-only mode
- ✅ User preference support for model selection
- ✅ Conversation context awareness for routing decisions

### Backward Compatibility
- ✅ All existing API endpoints work unchanged
- ✅ Response format enhanced with new metadata
- ✅ Feature flag allows complete disable of multi-LLM
- ✅ OpenAI-only fallback maintains full functionality
- ✅ Environment variables are additive (no breaking changes)

---

**Migration Complete!** 🎉

Your Tala AI system now supports intelligent multi-LLM routing with cost optimization and performance monitoring while maintaining full backward compatibility.