# CMO Knowledge Base Implementation Guide

This guide explains the CMO (Chief Marketing Officer) knowledge base infrastructure for Tala AI.

## Overview

The CMO Knowledge Base provides structured marketing knowledge across five key areas:
- **SEO** - Search Engine Optimization
- **Email** - Email Marketing
- **Social** - Social Media Marketing
- **Direct Mail** - Physical Mail Campaigns
- **Ads** - Paid Advertising (PPC, Display, etc.)

## Architecture

### Directory Structure
```
server/knowledge/cmo/
├── metadata.json          # Knowledge base configuration
├── seo/                   # SEO knowledge files
│   └── title_tags.json
├── email/                 # Email marketing knowledge
│   └── subject_lines.json
├── social/                # Social media knowledge
├── direct-mail/           # Direct mail knowledge
└── ads/                   # Advertising knowledge
```

### Key Components

#### 1. CMOKnowledgeBase Service
Location: `server/services/cmo/CMOKnowledgeBase.js`

Features:
- Knowledge loading from JSON files
- Vector embeddings generation
- Semantic search via Qdrant
- Dynamic knowledge addition
- Category and topic filtering

#### 2. CMOAssistant Service
Location: `server/services/cmo/CMOAssistant.js`

Features:
- Query processing and intent detection
- Context-aware responses
- Quick actions (title checker, subject tester, etc.)
- Template and best practice retrieval

#### 3. Knowledge Converter
Location: `server/scripts/convert-knowledge.js`

Features:
- Convert Markdown/Text files to structured JSON
- Extract templates, best practices, and tools
- Automatic categorization and topic inference

## Knowledge Structure

### Knowledge Item Schema
```json
{
  "id": "unique-identifier",
  "type": "guide|template|tool|tip|reference|checklist",
  "topic": "specific_topic",
  "title": "Item Title",
  "content": "Main content or description",
  "metadata": {
    "author": "Author name",
    "lastUpdated": "2024-01-15",
    "source": "source-file.json"
  }
}
```

### Types of Knowledge

1. **Guide** - Comprehensive how-to content
2. **Template** - Reusable patterns with variables
3. **Tool** - Interactive utilities (checkers, calculators)
4. **Tip** - Quick actionable advice
5. **Reference** - Documentation and specifications
6. **Checklist** - Step-by-step verification lists

## Usage

### 1. Initialize the Knowledge Base

```bash
cd server
node scripts/init-cmo-knowledge.js
```

This will:
- Create Qdrant collection
- Load all knowledge files
- Generate embeddings
- Test search functionality

### 2. Convert Marketing Documents

Convert a single file:
```bash
node scripts/convert-knowledge.js path/to/document.md seo title_tags
```

Convert a directory:
```bash
node scripts/convert-knowledge.js path/to/docs/ email
```

### 3. Use in Application

```javascript
import { cmoAssistant } from './services/cmo/CMOAssistant.js';

// Initialize
await cmoAssistant.initialize();

// Process a query
const results = await cmoAssistant.processQuery(
  "How do I write better email subject lines?",
  { category: 'email', subMode: 'email' }
);

// Get quick actions
const actions = cmoAssistant.getQuickActions('seo');

// Execute quick action
const analysis = await cmoAssistant.executeQuickAction(
  'title-checker',
  { title: 'Best SEO Tools 2024 - Complete Guide' }
);
```

### 4. Add Knowledge Programmatically

```javascript
await cmoKnowledgeBase.addKnowledge('seo', {
  type: 'tip',
  topic: 'page_speed',
  title: 'Image Optimization Tip',
  content: 'Use WebP format for images to reduce file size by 30%.',
  metadata: { source: 'user-contributed' }
});
```

## Integration with Chat

The CMO knowledge integrates with the chat system through mode detection:

```javascript
// In chatService.js
if (mode === 'cmo') {
  const cmoResults = await cmoAssistant.processQuery(message, {
    category: 'cmo',
    subMode: subMode // 'seo', 'email', etc.
  });
  
  // Use results to enhance response
  context.marketingKnowledge = cmoResults.results;
  context.suggestions = cmoResults.suggestions;
}
```

## Quick Actions

Each marketing category has specialized quick actions:

### SEO Actions
- **Title Tag Checker** - Analyze title length and structure
- **Meta Generator** - Create meta descriptions
- **Keyword Research** - Find related keywords
- **Content Audit** - Analyze content quality

### Email Actions
- **Subject Line Tester** - Check for spam words and length
- **Spam Checker** - Full email deliverability check
- **Template Gallery** - Browse email templates
- **Segment Builder** - Create audience segments

### Social Actions
- **Hashtag Generator** - Create relevant hashtags
- **Post Ideas** - Generate content ideas
- **Content Calendar** - Plan posting schedule
- **Engagement Tips** - Improve interaction rates

## Best Practices

1. **Knowledge Organization**
   - One JSON file per topic within each category
   - Use consistent naming conventions
   - Include metadata for tracking

2. **Content Quality**
   - Keep content concise and actionable
   - Include examples where relevant
   - Update regularly with industry changes

3. **Search Optimization**
   - Use descriptive titles
   - Include relevant keywords in content
   - Tag items with appropriate topics

4. **Performance**
   - Batch knowledge updates
   - Cache frequently accessed items
   - Monitor Qdrant collection size

## Troubleshooting

### Knowledge Not Loading
- Check file permissions in knowledge/cmo/
- Verify JSON syntax in knowledge files
- Ensure metadata.json exists

### Search Not Working
- Verify Qdrant is running (default: localhost:6333)
- Check OpenAI API key for embeddings
- Review vector dimension settings (1536 for ada-002)

### Quick Actions Failing
- Ensure CMOAssistant is initialized
- Check action ID matches implementation
- Verify required parameters are provided

## Future Enhancements

1. **Auto-learning** - Learn from user interactions
2. **External integrations** - Connect to marketing tools
3. **Performance tracking** - Monitor knowledge usage
4. **Multi-language** - Support international marketing
5. **Visual tools** - Add image/video analysis