# Email to Task Conversion System Guide

## Overview

The Email to Task Conversion system provides seamless "Send to Tala" functionality that intelligently extracts actionable tasks from emails, maintaining context and suggesting optimal task details.

## Architecture

### Core Components

1. **EmailToTaskConverter.js**
   - Main conversion engine
   - Email content extraction
   - Thread context preservation
   - Task enrichment pipeline

2. **TaskSuggestionEngine.js**
   - AI-powered suggestions
   - Priority and deadline estimation
   - Assignee recommendations
   - Template matching

3. **EmailActionHandler.js**
   - "Send to Tala" action handling
   - Progress tracking
   - WebSocket real-time updates
   - Batch processing support

## Features

### 1. Intelligent Task Extraction

The system automatically identifies and extracts:
- Action items and requests
- Deadlines and important dates
- Travel details (flights, hotels, etc.)
- Contact information
- Financial amounts
- Booking references

### 2. Context-Aware Processing

- **Thread Analysis**: Understands email conversations
- **Decision Tracking**: Identifies previous decisions
- **Participant Mapping**: Suggests appropriate assignees
- **Attachment Handling**: Links relevant documents

### 3. Smart Suggestions

The TaskSuggestionEngine provides:

```javascript
{
  title: "✈️ Flight: Book flight to Tokyo for Johnson family",
  priority: "urgent",
  priorityReason: "Email marked as urgent; From VIP sender",
  dueDate: "2024-03-24T22:00:00.000Z",
  dueDateReason: "Based on urgent priority (1 days)",
  assignees: [
    {
      userId: "flight_specialist",
      confidence: 0.8,
      reason: "Specialist in flight"
    }
  ],
  tags: ["urgent", "flight", "vip", "booking"],
  reminders: [
    {
      time: "2024-03-23T14:00:00.000Z",
      type: "email",
      message: "Tomorrow: Book flight to Tokyo"
    }
  ]
}
```

### 4. Email Type Detection

Automatically categorizes emails:
- `booking_confirmation` - Processes confirmations
- `client_request` - Urgent client needs
- `itinerary` - Travel plans
- `invoice` - Payment deadlines
- `document` - Visa/passport requirements

### 5. Real-time Updates via WebSocket

```javascript
// Client-side WebSocket connection
const ws = new WebSocket('ws://localhost:3002');

ws.send(JSON.stringify({
  type: 'subscribe',
  sessionId: 'sess_123'
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle progress updates
};
```

## API Usage

### Send Email to Tala

```bash
POST /api/email-tasks/send-to-tala
{
  "emailId": "email_123",
  "options": {
    "requireConfirmation": true,
    "autoCreate": false
  }
}
```

Response:
```json
{
  "success": true,
  "sessionId": "sess_123",
  "taskCount": 3,
  "requiresConfirmation": true
}
```

### Confirm Task Creation

```bash
POST /api/email-tasks/confirm/sess_123
{
  "confirmed": true,
  "edits": {
    "0": {
      "priority": "urgent",
      "dueDate": "2024-03-25T10:00:00Z"
    }
  },
  "rejectedTasks": []
}
```

### Batch Processing

```bash
POST /api/email-tasks/batch-send-to-tala
{
  "emailIds": ["email_1", "email_2", "email_3"],
  "options": {
    "autoCreate": true
  }
}
```

### Quick Actions

```bash
POST /api/email-tasks/quick-action
{
  "actionId": "createFlightTask",
  "emailId": "email_123"
}
```

Available actions:
- `sendToTala` - Full extraction
- `createFlightTask` - Quick flight task
- `createHotelTask` - Quick hotel task
- `createItinerary` - Trip planning
- `extractAllTasks` - Aggressive extraction

## Conversion Flow

```
1. Email Selected in UI
   ↓
2. "Send to Tala" Clicked
   ↓
3. Email Content Extracted
   - Clean email body
   - Extract links, dates, amounts
   - Detect email type
   - Analyze sentiment/urgency
   ↓
4. Thread Context Retrieved
   - Previous emails
   - Participants
   - Decisions made
   - Related attachments
   ↓
5. Tasks Extracted via AI
   - Identify action items
   - Extract entities
   - Calculate confidence
   ↓
6. Suggestions Generated
   - Enhance titles
   - Suggest priorities
   - Estimate due dates
   - Recommend assignees
   - Propose reminders
   ↓
7. Preview Shown to User
   - Editable fields
   - Confidence indicators
   - Suggested values
   ↓
8. User Confirms/Edits
   ↓
9. Tasks Created
   - Link to source email
   - Set reminders
   - Notify assignees
   ↓
10. Learn from Feedback
    - Track accuracy
    - Update patterns
    - Improve suggestions
```

## Pattern Recognition

The system learns from usage patterns:

```javascript
// Tracked patterns
{
  "booking_confirmation_airline@booking.com": {
    "count": 45,
    "successRate": 0.95,
    "commonTasks": [
      { "type": "flight", "priority": "high" }
    ]
  },
  "client_request_vip@company.com": {
    "count": 23,
    "successRate": 0.87,
    "commonTasks": [
      { "type": "hotel", "priority": "urgent" }
    ]
  }
}
```

## Intelligent Features

### 1. Booking Confirmation Detection
- Automatically creates itinerary tasks
- Extracts booking references
- Sets check-in reminders
- Links confirmation documents

### 2. Client Request Handling
- Identifies urgency indicators
- Suggests appropriate priority
- Recommends specialized agents
- Creates follow-up reminders

### 3. Deadline Detection
- Finds mentioned dates
- Calculates working days
- Sets multiple reminders
- Highlights time-sensitive items

### 4. Travel Date Recognition
- Creates preparation timeline
- Suggests visa tasks
- Adds packing reminders
- Coordinates multi-leg trips

### 5. Template Learning
- Recognizes recurring patterns
- Suggests appropriate templates
- Adapts to user preferences
- Builds custom workflows

## Feedback System

### Recording Feedback

```javascript
POST /api/email-tasks/feedback
{
  "suggestionId": "sug_123",
  "actualValues": {
    "priority": "high",
    "assignee": "agent_001",
    "dueDate": "2024-03-25"
  },
  "accepted": true
}
```

### Accuracy Metrics

```javascript
GET /api/email-tasks/accuracy

Response:
{
  "metrics": {
    "priority": {
      "accuracy": 0.82,
      "total": 156
    },
    "dueDate": {
      "accuracy": 0.74,
      "total": 156
    },
    "assignee": {
      "accuracy": 0.89,
      "total": 134
    }
  }
}
```

## WebSocket Events

### Client → Server
- `subscribe` - Subscribe to session updates
- `unsubscribe` - Unsubscribe from session
- `getStatus` - Request current status
- `confirmTasks` - Confirm task creation
- `cancelConversion` - Cancel active conversion

### Server → Client
- `connected` - Connection established
- `progress` - Conversion progress update
- `status` - Current session status
- `confirmationResult` - Task creation result
- `error` - Error notification

## Best Practices

1. **Email Preparation**
   - Keep action items clear
   - Include dates explicitly
   - Mention priority if urgent
   - Use consistent terminology

2. **Thread Management**
   - Keep related discussions in same thread
   - Reference previous decisions
   - Update thread with confirmations

3. **Task Creation**
   - Review suggestions before confirming
   - Edit priorities based on context
   - Add team members as needed
   - Set appropriate reminders

4. **Feedback Loop**
   - Correct inaccurate suggestions
   - Provide feedback on accuracy
   - Build templates for common tasks
   - Train system on preferences

## Configuration

```javascript
// EmailActionHandler options
{
  enableWebSocket: true,
  wsPort: 3002,
  autoProcess: false,
  showProgress: true,
  allowEditing: true,
  batchProcessing: true,
  maxBatchSize: 10
}

// TaskSuggestionEngine options
{
  useAI: true,
  learnFromHistory: true,
  maxSuggestions: 5,
  confidenceThreshold: 0.7
}

// EmailToTaskConverter options
{
  autoCreate: false,
  preserveThread: true,
  enrichTasks: true,
  generateSuggestions: true
}
```

## Testing

Run the comprehensive demo:
```bash
node test-email-to-task.js
```

This demonstrates:
- Flight booking extraction
- Hotel request processing
- Visa reminder handling
- Complete itinerary creation
- Statistics and accuracy

## Troubleshooting

### Common Issues

1. **No tasks extracted**
   - Check email has clear action items
   - Verify email content is not empty
   - Ensure proper authentication

2. **Incorrect suggestions**
   - Provide feedback for learning
   - Check pattern database
   - Review confidence scores

3. **WebSocket connection failed**
   - Verify port availability
   - Check firewall settings
   - Ensure service is running

4. **Slow extraction**
   - Check email size
   - Review thread length
   - Monitor AI service response

## Future Enhancements

- Natural language task creation
- Voice command support
- Multi-language extraction
- Calendar integration
- Mobile app support
- Advanced ML models
- Custom workflow designer