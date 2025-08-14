# What You Need to Provide to Restore Enterprise Features

## 1. Feature Flags (Easy - Just Copy/Paste)

Add these lines to your `.env` file to turn on the features:

```env
# Core Intelligence Features - REQUIRED
ENABLE_MULTI_LLM=true
ENABLE_INTELLIGENT_ROUTING=true
ENABLE_CONTEXT_COMPRESSION=true
ENABLE_LEARNING_ENGINE=true
ENABLE_AGENT_ORCHESTRATION=true

# Optional but Recommended
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_COST_OPTIMIZATION=true
ENABLE_HEALTH_CHECKS=true
```

## 2. Database Configuration (Choose One Option)

### Option A: No Database Setup (Easiest - Use Mock Mode)
```env
# Just add this one line - no database needed
USE_MOCK_MODE=true
```
**Pros**: Works immediately, no setup needed
**Cons**: Data doesn't persist between server restarts

### Option B: Use Supabase (Production Ready)
```env
# You need to create a Supabase account and project
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-from-supabase
SUPABASE_SERVICE_KEY=your-service-key-from-supabase

# Enable database features
ENABLE_DATABASE_READ=true
ENABLE_DUAL_WRITE=true
FALLBACK_TO_JSON=true
```

**How to get these**:
1. Go to [supabase.com](https://supabase.com) and create free account
2. Create a new project
3. Go to Settings → API
4. Copy the URL and keys

## 3. Additional LLM Provider Keys (Optional but Powerful)

You already have OpenAI. To enable multi-LLM with automatic fallbacks and cost optimization, add any of these:

### Anthropic (Claude) - Recommended
```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
```
**Get it from**: [console.anthropic.com](https://console.anthropic.com)
**Why**: Best for complex reasoning, 200k context window
**Cost**: $3-15 per 1M tokens

### Google AI (Gemini) - Recommended
```env
GOOGLE_AI_API_KEY=AIzaSyxxxxx
```
**Get it from**: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
**Why**: Fastest responses, extremely cheap
**Cost**: $0.075 per 1M tokens (cheapest!)

### Grok (X.AI) - Optional
```env
GROK_API_KEY=xai-xxxxx
```
**Get it from**: [x.ai](https://x.ai) (if you have access)
**Why**: Fastest response times (380-510ms)
**Cost**: $5 per 1M tokens

## Quick Start Options

### 🚀 Minimal Setup (Just Features, No Persistence)
```env
# Add just these 6 lines to your .env
ENABLE_MULTI_LLM=true
ENABLE_INTELLIGENT_ROUTING=true
ENABLE_CONTEXT_COMPRESSION=true
ENABLE_LEARNING_ENGINE=true
ENABLE_AGENT_ORCHESTRATION=true
USE_MOCK_MODE=true
```

### 💪 Recommended Setup (With Multi-LLM)
```env
# Features
ENABLE_MULTI_LLM=true
ENABLE_INTELLIGENT_ROUTING=true
ENABLE_CONTEXT_COMPRESSION=true
ENABLE_LEARNING_ENGINE=true
ENABLE_AGENT_ORCHESTRATION=true
USE_MOCK_MODE=true

# Additional Providers (get at least one)
ANTHROPIC_API_KEY=your-claude-key
GOOGLE_AI_API_KEY=your-gemini-key
```

### 🏆 Full Production Setup
```env
# All features
ENABLE_MULTI_LLM=true
ENABLE_INTELLIGENT_ROUTING=true
ENABLE_CONTEXT_COMPRESSION=true
ENABLE_LEARNING_ENGINE=true
ENABLE_AGENT_ORCHESTRATION=true

# Supabase (create free project)
SUPABASE_URL=your-url
SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_KEY=your-service-key
ENABLE_DATABASE_READ=true

# All LLM providers
ANTHROPIC_API_KEY=your-key
GOOGLE_AI_API_KEY=your-key
GROK_API_KEY=your-key-if-you-have-access

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_COST_OPTIMIZATION=true
DAILY_BUDGET_LIMIT=10
MONTHLY_BUDGET_LIMIT=200
```

## What Happens When You Add These

### With Just Feature Flags + Mock Mode:
- ✅ All intelligence features work
- ✅ Multi-agent orchestration active
- ✅ Context compression (95% reduction)
- ✅ Learning engine active
- ⚠️ No data persistence between restarts

### With One Additional LLM Provider:
- ✅ Automatic fallbacks if OpenAI fails
- ✅ Cost optimization (routes to cheapest)
- ✅ Performance routing (fastest for simple queries)
- ✅ Specialized routing (Claude for complex, Gemini for speed)

### With Supabase:
- ✅ Full conversation persistence
- ✅ User profiles saved
- ✅ Learning data preserved
- ✅ Metrics and analytics

## Step-by-Step Guide

1. **Copy the "Minimal Setup" block above**
2. **Paste at the end of your `.env` file**
3. **Restart your server**
4. **Look for these logs**:
   ```
   🤖 Initializing Multi-LLM Router...
   ✅ Intelligent chat system ready
   ```

5. **Test it works**:
   ```bash
   curl http://localhost:5008/api/chat/health
   ```

## Cost Estimates

With all providers enabled and intelligent routing:
- Simple queries: ~$0.00007 (Gemini)
- Complex queries: ~$0.003 (Claude)
- Average monthly cost for 1000 queries/day: ~$15-30

## Need Help?

The absolute minimum to see improvement:
```env
ENABLE_MULTI_LLM=true
USE_MOCK_MODE=true
```

That's it! Just these 2 lines will reactivate most features.