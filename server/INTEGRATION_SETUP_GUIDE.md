# Third-Party Integration Setup Guide

## Overview

Tala AI supports seamless integration with popular task management tools like Notion and Linear. This guide walks you through setting up and managing these integrations.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Available Integrations](#available-integrations)
3. [Setup Instructions](#setup-instructions)
4. [Sync Strategies](#sync-strategies)
5. [Field Mappings](#field-mappings)
6. [Conflict Resolution](#conflict-resolution)
7. [Monitoring & Health](#monitoring--health)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Enable Integration

```javascript
// Enable Notion integration
const response = await fetch('/api/integrations/notion/enable', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        config: {
            apiKey: 'secret_your_notion_api_key',
            databaseId: 'your-database-id'
        },
        syncDirection: 'bidirectional',
        syncMode: 'batch'
    })
});
```

### 2. Test Connection

```javascript
// Test before enabling
const testResponse = await fetch('/api/integrations/notion/test', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        config: {
            apiKey: 'secret_your_notion_api_key',
            databaseId: 'your-database-id'
        }
    })
});
```

### 3. Trigger Sync

```javascript
// Manual sync
await fetch(`/api/integrations/configs/${configId}/sync`, {
    method: 'POST'
});
```

## Available Integrations

### Notion

**Features:**
- Create and update tasks in Notion databases
- Bidirectional sync
- Custom property mapping
- Rich text support
- File attachments
- Relations and mentions

**Required Configuration:**
- `apiKey`: Your Notion integration API key
- `databaseId`: Target database ID

**Optional Configuration:**
- `defaultView`: Default database view
- `syncArchived`: Include archived pages
- `propertyMappings`: Custom field mappings

### Linear

**Features:**
- Create and update Linear issues
- Team and project support
- Label synchronization
- Priority and state mapping
- Comments and attachments
- Cycle and milestone support

**Required Configuration:**
- `apiKey`: Your Linear API key
- `teamId`: Target team ID

**Optional Configuration:**
- `projectId`: Default project
- `defaultAssigneeId`: Default assignee
- `labelPrefix`: Prefix for synced labels

## Setup Instructions

### Notion Setup

1. **Create Notion Integration**
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Give it a name (e.g., "Tala AI Sync")
   - Copy the API key

2. **Share Database with Integration**
   - Open your task database in Notion
   - Click "Share" → "Invite"
   - Select your integration
   - Copy the database ID from the URL

3. **Configure in Tala AI**
   ```javascript
   {
       "config": {
           "apiKey": "secret_abc123...",
           "databaseId": "123e4567-e89b-12d3-a456-426614174000"
       },
       "fieldMappings": {
           "task": {
               "title": "Name",
               "status": "Status",
               "priority": "Priority",
               "dueDate": "Due Date",
               "tags": "Tags"
           }
       }
   }
   ```

### Linear Setup

1. **Generate API Key**
   - Go to Linear Settings → API
   - Create a personal API key
   - Copy the key

2. **Find Team ID**
   - Go to Team Settings
   - Copy the team ID from URL

3. **Configure in Tala AI**
   ```javascript
   {
       "config": {
           "apiKey": "lin_api_abc123...",
           "teamId": "TEAM-123"
       },
       "fieldMappings": {
           "task": {
               "title": "title",
               "status": "state",
               "priority": "priority",
               "assignedTo": "assignee"
           }
       }
   }
   ```

## Sync Strategies

### One-Way Push (Tala → External)

Tasks created in Tala are pushed to the external system. Changes in the external system are not synced back.

```javascript
{
    "syncDirection": "push",
    "syncMode": "realtime"
}
```

### One-Way Pull (External → Tala)

Tasks from the external system are imported into Tala. Changes in Tala are not pushed back.

```javascript
{
    "syncDirection": "pull",
    "syncMode": "batch"
}
```

### Two-Way Sync

Changes in both systems are synchronized bidirectionally with conflict resolution.

```javascript
{
    "syncDirection": "bidirectional",
    "syncMode": "batch",
    "conflictStrategy": "newest_wins"
}
```

### Selective Sync

Only sync tasks matching specific criteria.

```javascript
{
    "syncDirection": "bidirectional",
    "filters": {
        "tags": ["important", "client"],
        "status": ["pending", "in_progress"],
        "priority": ["high", "urgent"]
    }
}
```

## Field Mappings

### Default Mappings

| Tala Field | Notion Property | Linear Field |
|------------|----------------|--------------|
| title | Name | title |
| status | Status | state |
| priority | Priority | priority |
| dueDate | Due Date | dueDate |
| assignedTo | Assignee | assignee |
| tags | Tags | labels |
| description | Page Content | description |

### Custom Mappings

```javascript
{
    "fieldMappings": {
        "task": {
            "title": "Task Name",
            "priority": "Importance",
            "metadata.client": "Client Name",
            "metadata.budget": "Budget Amount"
        }
    },
    "customMappings": {
        "projectCode": "Project",
        "estimatedHours": "Time Estimate"
    }
}
```

## Conflict Resolution

### Available Strategies

1. **Tala Wins**: Always use Tala's version
2. **External Wins**: Always use external system's version
3. **Newest Wins**: Use the most recently updated version
4. **Manual**: Queue conflicts for manual resolution
5. **Merge**: Attempt to merge changes (if supported)

### Resolving Conflicts Manually

```javascript
// Get pending conflicts
const conflicts = await fetch(`/api/integrations/configs/${configId}/conflicts`);

// Resolve a conflict
await fetch(`/api/integrations/conflicts/${conflictId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({
        resolution: 'use_tala', // or 'use_external', 'use_custom'
        data: customData // if using custom resolution
    })
});
```

## Monitoring & Health

### Health Check

```javascript
const health = await fetch(`/api/integrations/configs/${configId}/health`);

// Response
{
    "status": "healthy",
    "indicators": {
        "successRate": 0.95,
        "errorRate": 0.05,
        "avgSyncDuration": 2500,
        "conflictRate": 0.1
    },
    "lastSuccessfulSync": "2024-01-20T10:30:00Z"
}
```

### Dashboard

```javascript
const dashboard = await fetch('/api/integrations/notion/dashboard?timeRange=24h');

// Response includes:
// - Summary statistics
// - Time series data
// - Top errors
// - Config health status
```

### Real-time Monitoring

```javascript
// WebSocket connection for real-time updates
const ws = new WebSocket('ws://localhost:3001/api/integrations/ws');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'metric':
            // Handle metric update
            updateDashboard(data.data);
            break;
            
        case 'alert':
            // Handle alert
            showAlert(data.data);
            break;
    }
};
```

## API Reference

### Endpoints

#### Integration Management
- `GET /api/integrations` - List available integrations
- `GET /api/integrations/configs` - Get user's configurations
- `POST /api/integrations/:id/enable` - Enable integration
- `POST /api/integrations/configs/:id/disable` - Disable integration
- `POST /api/integrations/:id/test` - Test connection

#### Synchronization
- `POST /api/integrations/configs/:id/sync` - Trigger manual sync
- `GET /api/integrations/configs/:id/sync/status` - Get sync status
- `GET /api/integrations/configs/:id/logs` - Get sync logs
- `POST /api/integrations/configs/:id/queue` - Queue sync operation

#### Field Mappings
- `GET /api/integrations/configs/:id/mappings` - Get mappings
- `PUT /api/integrations/configs/:id/mappings` - Update mappings

#### Conflicts
- `GET /api/integrations/configs/:id/conflicts` - Get conflicts
- `POST /api/integrations/conflicts/:id/resolve` - Resolve conflict

#### Monitoring
- `GET /api/integrations/configs/:id/health` - Get health status
- `GET /api/integrations/:id/dashboard` - Get dashboard data
- `GET /api/integrations/alerts` - Get active alerts
- `POST /api/integrations/alerts/:id/acknowledge` - Acknowledge alert

## Troubleshooting

### Common Issues

#### 1. "Invalid API key"
- Verify API key is correct
- Check key has necessary permissions
- Ensure key hasn't expired

#### 2. "Database not found"
- Verify database/team ID
- Ensure integration has access
- Check sharing permissions

#### 3. "Sync taking too long"
- Check number of items being synced
- Verify API rate limits
- Consider batch size adjustments

#### 4. "High conflict rate"
- Review conflict strategy
- Check for concurrent edits
- Consider sync frequency

### Debug Mode

Enable detailed logging:

```javascript
{
    "config": {
        // ... your config
    },
    "debug": true,
    "verboseLogging": true
}
```

### Rate Limiting

Both Notion and Linear have API rate limits:

- **Notion**: 3 requests per second
- **Linear**: 150 requests per minute

The integration system automatically handles rate limiting with retries.

## Best Practices

1. **Start with One-Way Sync**
   - Test with push-only first
   - Gradually move to bidirectional

2. **Use Selective Sync**
   - Sync only what's needed
   - Use filters to reduce conflicts

3. **Regular Health Checks**
   - Monitor sync performance
   - Address issues promptly

4. **Backup Before Major Changes**
   - Export data before changing mappings
   - Test in development first

5. **Handle Conflicts Promptly**
   - Don't let conflicts accumulate
   - Define clear resolution strategy

## Example: Complete Setup Flow

```javascript
// 1. Test connection
const testResult = await fetch('/api/integrations/notion/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        config: {
            apiKey: process.env.NOTION_API_KEY,
            databaseId: process.env.NOTION_DATABASE_ID
        }
    })
});

if (!testResult.ok) {
    console.error('Connection test failed');
    return;
}

// 2. Enable integration
const enableResult = await fetch('/api/integrations/notion/enable', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user_123'
    },
    body: JSON.stringify({
        config: {
            apiKey: process.env.NOTION_API_KEY,
            databaseId: process.env.NOTION_DATABASE_ID
        },
        syncDirection: 'bidirectional',
        syncMode: 'batch',
        conflictStrategy: 'newest_wins',
        filters: {
            status: ['pending', 'in_progress']
        },
        fieldMappings: {
            task: {
                title: 'Name',
                status: 'Status',
                priority: 'Priority',
                dueDate: 'Due Date',
                tags: 'Tags'
            }
        }
    })
});

const { configId } = await enableResult.json();

// 3. Trigger initial sync
await fetch(`/api/integrations/configs/${configId}/sync`, {
    method: 'POST'
});

// 4. Monitor health
setInterval(async () => {
    const health = await fetch(`/api/integrations/configs/${configId}/health`);
    const data = await health.json();
    
    if (data.status !== 'healthy') {
        console.warn('Integration health issue:', data.issues);
    }
}, 60000); // Check every minute
```

## Support

For additional help:
- Check the API documentation
- Review error logs
- Contact support with integration ID and error details

Remember: The integration system is designed to work without any integrations enabled. All features remain fully functional using Tala AI's native task management.