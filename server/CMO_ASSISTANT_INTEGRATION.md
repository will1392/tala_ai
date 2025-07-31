# CMO Assistant Integration Guide

This guide explains how to integrate the CMO Assistant functionality into Tala AI's chat system.

## Overview

The CMO Assistant provides intelligent marketing assistance across five channels:
- **SEO** - Search engine optimization
- **Email** - Email marketing campaigns
- **Social** - Social media marketing
- **Direct Mail** - Physical mail campaigns
- **Ads** - Paid advertising (PPC, display)

## Architecture

### Components

1. **CMOChatHandler** (`services/cmo/CMOChatHandler.js`)
   - Processes marketing queries
   - Formats responses with knowledge
   - Handles quick actions

2. **CMOAssistant** (`services/cmo/CMOAssistant.js`)
   - Query type detection
   - Knowledge retrieval
   - Quick action execution

3. **CMOKnowledgeBase** (`services/cmo/CMOKnowledgeBase.js`)
   - Stores marketing knowledge
   - Semantic search via Qdrant
   - Dynamic knowledge addition

4. **System Prompts** (`prompts/cmo/system-prompts.js`)
   - Mode-specific prompts
   - Response templates
   - Marketing context

## Integration Steps

### 1. Update Chat Route

Replace the existing intelligent chat route:

```bash
# Backup current route
cp server/routes/intelligentChat.js server/routes/intelligentChat-backup.js

# Use CMO-enabled version
cp server/routes/intelligentChat-cmo.js server/routes/intelligentChat.js
```

### 2. Initialize CMO Knowledge Base

```bash
cd server
node scripts/init-cmo-knowledge.js
```

### 3. Add Marketing Knowledge

```bash
# Add sample knowledge
node scripts/add-cmo-knowledge.js

# Or import from CSV
node scripts/import-knowledge-csv.js marketing-data.csv email
```

## API Endpoints

### Chat with Mode Support

```javascript
POST /api/chat/v2
{
  "message": "How do I improve my email open rates?",
  "mode": "cmo",
  "subMode": "email",
  "conversationId": "optional-id"
}

Response:
{
  "success": true,
  "response": "Here's how to improve email open rates...",
  "mode": "cmo",
  "subMode": "email",
  "metadata": {
    "cmo": {
      "queryType": "howto",
      "confidence": 0.85,
      "sources": [...]
    },
    "suggestions": [...],
    "quickActions": [...]
  }
}
```

### Execute Quick Actions

```javascript
POST /api/chat/cmo/quick-action
{
  "actionId": "title-checker",
  "params": {
    "title": "Best SEO Tools 2024"
  },
  "subMode": "seo"
}

Response:
{
  "success": true,
  "actionId": "title-checker",
  "result": {
    "title": "Best SEO Tools 2024",
    "length": 18,
    "status": "warning",
    "issues": ["Title is too short"],
    "suggestions": ["Add more descriptive keywords"]
  }
}
```

### Search Knowledge

```javascript
GET /api/chat/cmo/knowledge/search?query=email+subject+lines&category=email&limit=5

Response:
{
  "success": true,
  "query": "email subject lines",
  "results": [...],
  "count": 5
}
```

### Get Templates

```javascript
GET /api/chat/cmo/templates?category=email&type=template

Response:
{
  "success": true,
  "category": "email",
  "templates": [...],
  "count": 3
}
```

## Frontend Integration

### Update Chat Service

```javascript
// In your chat service
async function sendMessage(message, mode, subMode) {
  const response = await fetch('/api/chat/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      message,
      mode,        // 'travel' or 'cmo'
      subMode,     // e.g., 'seo', 'email'
      conversationId
    })
  });
  
  return response.json();
}
```

### Handle Quick Actions

```javascript
// Quick action button handler
async function handleQuickAction(actionId, params) {
  const response = await fetch('/api/chat/cmo/quick-action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      actionId,
      params,
      subMode: currentSubMode
    })
  });
  
  const result = await response.json();
  displayActionResult(result);
}
```

### Display Mode-Specific UI

```javascript
// Show quick actions based on response
if (response.metadata.quickActions) {
  response.metadata.quickActions.forEach(action => {
    createQuickActionButton(action);
  });
}

// Show knowledge sources
if (response.metadata.cmo?.sources) {
  displaySources(response.metadata.cmo.sources);
}
```

## Query Examples

### SEO Queries
- "How do I write a good title tag?"
- "What's the ideal meta description length?"
- "Help me with keyword research for [topic]"
- "Check this title tag: [title]"

### Email Queries
- "Write a subject line for [campaign]"
- "How can I improve email deliverability?"
- "Create a welcome email template"
- "Test this subject line: [subject]"

### Social Media Queries
- "What are the best times to post on Instagram?"
- "Generate hashtags for [content]"
- "Create a social media content calendar"
- "How do I increase engagement?"

### Advertising Queries
- "Write Google Ads copy for [product]"
- "How do I improve Quality Score?"
- "What's a good CTR for [industry]?"
- "Create Facebook ad variations"

## Testing

### Test Basic Functionality

```bash
cd server
node test-cmo-assistant.js
```

### Test via API

```bash
# Test CMO mode
curl -X POST http://localhost:3001/api/chat/v2 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_key_123" \
  -d '{
    "message": "How do I improve my SEO?",
    "mode": "cmo",
    "subMode": "seo"
  }'

# Test quick action
curl -X POST http://localhost:3001/api/chat/cmo/quick-action \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_key_123" \
  -d '{
    "actionId": "title-checker",
    "params": {"title": "Test Title"}
  }'
```

## Customization

### Add Custom Quick Actions

```javascript
// In CMOAssistant.js
executeQuickAction(actionId, params) {
  switch(actionId) {
    case 'custom-action':
      return this.customActionHandler(params);
    // ... other actions
  }
}

customActionHandler(params) {
  // Your custom logic
  return {
    success: true,
    result: 'Custom action completed'
  };
}
```

### Extend Knowledge Types

```javascript
// Add new knowledge type in conversion script
sectionToKnowledgeItem(sectionName, content, category, frontmatter) {
  if (sectionLower.includes('case study')) {
    return {
      type: 'case_study',
      // ... your structure
    };
  }
  // ... existing types
}
```

### Custom Response Formatting

```javascript
// In CMOChatHandler.js
formatKnowledgeResults(results, queryType) {
  // Add custom formatting for your knowledge types
  if (result.type === 'custom_type') {
    content += this.formatCustomType(result);
  }
}
```

## Performance Optimization

1. **Cache Frequent Queries**
   - Implement Redis caching for common queries
   - Cache knowledge search results

2. **Batch Knowledge Loading**
   - Load knowledge asynchronously on startup
   - Use lazy loading for large datasets

3. **Optimize Vector Search**
   - Adjust Qdrant collection settings
   - Implement result filtering

## Monitoring

Track CMO usage:
- Query types and frequencies
- Sub-mode usage patterns
- Quick action execution
- Knowledge retrieval performance
- User satisfaction metrics

## Troubleshooting

### Knowledge Not Found
- Verify knowledge files exist in `/knowledge/cmo/`
- Check Qdrant collection initialization
- Review search query formatting

### Slow Response Times
- Check Qdrant performance
- Monitor OpenAI API latency
- Review knowledge base size

### Mode Not Working
- Verify CMO handler initialization
- Check mode parameter in requests
- Review system prompt configuration