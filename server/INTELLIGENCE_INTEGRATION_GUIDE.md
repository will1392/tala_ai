# Tala Intelligence System Integration Guide

## Overview

The Tala Intelligence System combines context management, memory systems, user profiling, and multi-agent orchestration to provide intelligent, context-aware responses. This guide explains how to integrate all components.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Tala Intelligence                        │
├─────────────────┬───────────────┬───────────────┬──────────┤
│ Context Manager │ Memory Manager│ Profile Manager│ Learning │
├─────────────────┴───────────────┴───────────────┴──────────┤
│                    Agent Orchestrator                        │
├─────────────────┬───────────────┬───────────────┬──────────┤
│ Email Monitor   │Itinerary Builder│Task Extractor│Doc Analyzer│
└─────────────────┴───────────────┴───────────────┴──────────┘
```

## 1. Server Setup

### Update server.js

```javascript
import express from 'express';
import TalaIntelligence from './services/intelligence/TalaIntelligence.js';
import intelligentChatRoutes from './routes/intelligentChat.js';
import monitoringRoutes from './routes/monitoring.js';
import { ServiceIntegration } from './services/integration/ServiceIntegration.js';

const app = express();

// Initialize Intelligence System
const intelligence = new TalaIntelligence({
  maxContextSize: 8000,
  compressionThreshold: 0.8,
  memoryRetrievalLimit: 10,
  learningEnabled: true
});

// Initialize on startup
async function initializeIntelligence() {
  try {
    await intelligence.initialize();
    console.log('✅ Tala Intelligence initialized');
    
    // Apply service integrations
    const integration = new ServiceIntegration(intelligence);
    await integration.initialize();
    await integration.applyIntegrations();
    console.log('✅ Service integrations applied');
    
  } catch (error) {
    console.error('❌ Intelligence initialization failed:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/chat', intelligentChatRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Set intelligence instance for monitoring
import { setIntelligence } from './routes/monitoring.js';
setIntelligence(intelligence);

// Start server
app.listen(PORT, async () => {
  await initializeIntelligence();
  console.log(`🚀 Server running on port ${PORT}`);
});
```

## 2. Environment Configuration

### .env file

```env
# Intelligence System
ENABLE_INTELLIGENCE=true
ENABLE_LEARNING=true
MAX_CONTEXT_SIZE=8000
COMPRESSION_THRESHOLD=0.8
MEMORY_RETENTION_DAYS=90

# Memory System
MEMORY_STORAGE_PATH=./data/memories
MEMORY_IMPORTANCE_THRESHOLD=0.5

# Learning Engine
LEARNING_DATA_PATH=./data/learning
LEARNING_UPDATE_INTERVAL=3600000
MIN_DATA_POINTS=10

# Agent System
MAX_CONCURRENT_AGENTS=5
AGENT_TIMEOUT=30000
USE_MOCK_LLM=false

# Profile System
DEFAULT_RESPONSE_STYLE=balanced
DEFAULT_MEMORY_THRESHOLD=0.5
```

## 3. Database Migrations

### Create required tables

```sql
-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  preferences JSONB DEFAULT '{}',
  expertise TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Memories
CREATE TABLE IF NOT EXISTS memories (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  type VARCHAR(50) NOT NULL,
  importance FLOAT DEFAULT 0.5,
  tags TEXT[] DEFAULT '{}',
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_importance (user_id, importance DESC),
  INDEX idx_tags (tags)
);

-- Learning data
CREATE TABLE IF NOT EXISTS learning_interactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  task_type VARCHAR(100) NOT NULL,
  agents_used TEXT[] NOT NULL,
  success BOOLEAN NOT NULL,
  execution_time INTEGER NOT NULL,
  feedback_rating INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_task (user_id, task_type)
);

-- Conversation threads
CREATE TABLE IF NOT EXISTS conversation_threads (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  conversation_id VARCHAR(255),
  messages JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_conv (user_id, conversation_id)
);
```

## 4. API Usage

### Enhanced Chat Endpoint

```javascript
// POST /api/chat/v2
const response = await fetch('/api/chat/v2', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    message: 'Help me plan a trip to Paris',
    conversationId: 'conv_123',
    preferredStyle: 'detailed',
    location: 'San Francisco',
    device: 'web'
  })
});

const result = await response.json();
console.log(result.response); // Intelligent response
console.log(result.metadata.suggestions); // Follow-up suggestions
```

### Submit Feedback

```javascript
// POST /api/chat/feedback
await fetch('/api/chat/feedback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    requestId: result.metadata.requestId,
    conversationId: 'conv_123',
    rating: 5,
    comment: 'Very helpful response!',
    helpful: true,
    accurate: true
  })
});
```

### Get Monitoring Data

```javascript
// GET /api/monitoring/overview
const metrics = await fetch('/api/monitoring/overview', {
  headers: {
    'Authorization': 'Bearer <admin-token>'
  }
});

const data = await metrics.json();
console.log(data.data.intelligence); // System metrics
console.log(data.data.services); // Service statuses
```

## 5. Testing

### Run comprehensive tests

```bash
# Test intelligence system
node test-intelligence.js

# Test multi-agent coordination
node test-multi-agent-system.js

# Test individual components
node test-memory-manager.js
node test-context-manager.js
node test-profile-manager.js
```

## 6. Production Considerations

### Performance Optimization

1. **Memory Indexing**: Create proper indexes on memory storage
2. **Context Caching**: Implement Redis caching for frequent contexts
3. **Agent Pool**: Maintain warm agent instances for faster response
4. **Batch Processing**: Process multiple requests in batches when possible

### Monitoring

1. **Metrics Collection**: Use Prometheus/Grafana for metrics
2. **Error Tracking**: Implement Sentry for error monitoring
3. **Performance Tracking**: Monitor response times and agent utilization
4. **User Satisfaction**: Track feedback scores and patterns

### Scaling

1. **Horizontal Scaling**: Intelligence system supports multiple instances
2. **Agent Distribution**: Distribute agents across multiple servers
3. **Memory Sharding**: Shard memory storage by user ID
4. **Queue Management**: Use message queues for async processing

## 7. Feature Flags

```javascript
const features = {
  enableIntelligence: process.env.ENABLE_INTELLIGENCE === 'true',
  enableLearning: process.env.ENABLE_LEARNING === 'true',
  enableCompression: process.env.ENABLE_COMPRESSION === 'true',
  enableMultiAgent: process.env.ENABLE_MULTI_AGENT === 'true'
};

// Use feature flags in code
if (features.enableIntelligence) {
  // Use intelligence system
} else {
  // Fallback to basic chat
}
```

## 8. Troubleshooting

### Common Issues

1. **Memory exhaustion**: Increase memory limits or enable compression
2. **Slow responses**: Check agent utilization and context size
3. **Learning not improving**: Ensure sufficient feedback data
4. **Context loss**: Verify threading service is working

### Debug Mode

```javascript
// Enable debug logging
process.env.DEBUG = 'tala:*';

// Log intelligence decisions
intelligence.on('routing', (decision) => {
  console.log('Routing decision:', decision);
});

intelligence.on('memory', (operation) => {
  console.log('Memory operation:', operation);
});
```

## 9. Migration from Old System

### Gradual Migration

1. **Phase 1**: Enable intelligence for new conversations only
2. **Phase 2**: Migrate existing user profiles
3. **Phase 3**: Import historical conversations as memories
4. **Phase 4**: Enable learning from historical data
5. **Phase 5**: Deprecate old chat endpoint

### Data Migration Script

```javascript
// migrate-to-intelligence.js
async function migrateData() {
  // Migrate user preferences
  const users = await getOldUsers();
  for (const user of users) {
    await intelligence.profileManager.createProfile(user.id, {
      preferences: user.settings,
      metadata: { migrated: true }
    });
  }
  
  // Migrate conversations as memories
  const conversations = await getOldConversations();
  for (const conv of conversations) {
    await intelligence.memoryManager.createMemory({
      userId: conv.userId,
      content: { conversation: conv.messages },
      type: 'historical',
      importance: 0.5,
      tags: ['migrated']
    });
  }
}
```

## 10. Best Practices

1. **Regular Backups**: Backup learning data and memories daily
2. **Privacy**: Implement data retention policies
3. **Feedback Loop**: Regularly review feedback and adjust
4. **Agent Updates**: Keep agent implementations current
5. **Monitoring**: Set up alerts for anomalies

## Conclusion

The Tala Intelligence System provides a comprehensive framework for intelligent, context-aware interactions. By following this guide, you can successfully integrate all components and provide users with a superior AI experience that learns and improves over time.