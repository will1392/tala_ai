# Task Management System Integration Guide

## Overview

The native task management system provides comprehensive task lifecycle management for travel-related operations. It integrates with the email system to automatically create tasks from incoming emails and provides workflow automation, reminders, and templates for common travel scenarios.

## Architecture

### Core Components

1. **Database Schema** (`migrations/003_create_task_management.sql`)
   - 6 interconnected tables for complete task management
   - Support for dependencies, assignments, reminders, and attachments
   - Audit trail with task history
   - Optimized views for common queries

2. **Services**
   - **TaskManager.js** - CRUD operations and core task management
   - **TaskWorkflow.js** - State transitions and lifecycle management
   - **TaskAutomation.js** - Rule-based automation and email integration
   - **ReminderService.js** - Notification scheduling and delivery

3. **API Endpoints** (`routes/tasks.js`)
   - RESTful API for all task operations
   - Bulk operations support
   - Analytics and reporting endpoints

4. **Templates** (`data/taskTemplates.js`)
   - Pre-defined templates for common travel tasks
   - Support for complex multi-phase trips
   - Emergency response templates

## Key Features

### 1. Email to Task Conversion
```javascript
// Automatic task creation from emails
const emailData = {
  email: { id: 'email_123', subject: 'Book flight to Paris' },
  extractedTasks: [{
    title: 'Book flight to Paris',
    priority: 'high',
    deadline: '2024-02-15',
    travelType: 'flight'
  }]
};

const tasks = await taskAutomation.createTaskFromEmail(emailData);
```

### 2. Task Dependencies
```javascript
// Create dependent tasks
await taskManager.addDependency(flightTaskId, visaTaskId, 'blocks');
// Flight booking is blocked until visa is completed
```

### 3. Workflow Automation
```javascript
// Define automation rules
const rule = {
  name: 'Flight Check-in Reminder',
  triggers: ['task_created'],
  conditions: [
    { field: 'travelType', operator: 'equals', value: 'flight' }
  ],
  actions: ['create_checkin_reminder']
};
```

### 4. Smart Reminders
- Automatic reminder creation based on task type and priority
- Multiple notification channels (email, SMS, push, in-app)
- Recurring reminders for ongoing tasks

## Integration Points

### 1. With Email System
- Tasks automatically created from extracted email content
- Email attachments linked to tasks
- Task updates can trigger email notifications

### 2. With Intelligence Layer
- TalaIntelligence can create and manage tasks
- Context-aware task prioritization
- Learning from task completion patterns

### 3. With Agent System
- Agents can be assigned to tasks
- Task Extractor agent feeds into task creation
- Agents can update task status

## API Usage Examples

### Create a Task
```bash
POST /api/tasks
{
  "title": "Book hotel in Rome",
  "description": "5-star hotel near city center",
  "priority": "high",
  "dueDate": "2024-02-20T15:00:00Z",
  "travelType": "hotel",
  "tags": ["urgent", "vip-client"],
  "assignees": [
    { "userId": "agent_001", "role": "assignee" }
  ]
}
```

### Update Task Status
```bash
POST /api/tasks/{taskId}/transition
{
  "newStatus": "in_progress",
  "reason": "Started hotel search"
}
```

### Create from Template
```bash
POST /api/tasks/templates/visa_tourist/create
{
  "title": "Visa for John Doe - Thailand",
  "dueDate": "2024-03-15T00:00:00Z"
}
```

### Bulk Operations
```bash
POST /api/tasks/bulk/transition
{
  "taskIds": ["task1", "task2", "task3"],
  "newStatus": "completed"
}
```

## Task Templates

### Available Templates

1. **Flight Operations**
   - `flight_booking` - Complete booking process
   - `flight_checkin` - Check-in reminders
   - `flight_changes` - Change/cancellation handling

2. **Accommodation**
   - `hotel_booking` - Hotel reservation process
   - `hotel_special_requests` - Special arrangements

3. **Documentation**
   - `visa_tourist` - Tourist visa application
   - `visa_business` - Business visa process
   - `insurance_standard` - Travel insurance

4. **Complete Trips**
   - `trip_leisure` - Full leisure vacation planning
   - `trip_business` - Business trip arrangements

5. **Emergency**
   - `emergency_lost_passport` - Lost document assistance
   - `emergency_medical` - Medical emergency support

## Workflow States

Tasks follow this state machine:
```
pending → in_progress → completed
   ↓           ↓
cancelled   on_hold → in_progress
```

### State Transition Rules
- Tasks must have assignees before starting
- Blocking dependencies must be completed first
- Completed and cancelled are terminal states

## Reminder Configuration

### Default Reminder Times
- **Urgent tasks**: 1 hour and 15 minutes before
- **High priority**: 2 hours and 30 minutes before  
- **Normal priority**: 1 day and 1 hour before
- **Travel-specific**: Custom times based on type

## Best Practices

1. **Task Creation**
   - Always include travel type for proper categorization
   - Set realistic due dates for reminder effectiveness
   - Use tags for easy filtering and search

2. **Dependencies**
   - Use 'blocks' for strict ordering requirements
   - Use 'relates_to' for informational links
   - Avoid circular dependencies

3. **Automation**
   - Test automation rules before enabling
   - Monitor automation execution for errors
   - Use conditions to prevent over-automation

4. **Templates**
   - Customize templates with client-specific data
   - Use phase-based templates for complex trips
   - Keep emergency templates readily accessible

## Monitoring and Analytics

### Key Metrics
- Task completion rate by type
- Average time to completion
- Overdue task tracking
- Automation success rate
- Reminder delivery statistics

### Available Reports
```javascript
// User productivity
GET /api/tasks/stats/user/{userId}

// Workflow efficiency  
GET /api/tasks/stats/workflow?dateFrom=2024-01-01

// Reminder performance
GET /api/tasks/stats/reminders
```

## Database Maintenance

### Regular Tasks
1. Archive completed tasks older than 1 year
2. Clean up cancelled reminders monthly
3. Optimize task history table quarterly

### Performance Tips
- Use indexed fields for filtering (status, priority, due_date)
- Limit history queries to recent timeframes
- Batch bulk operations when possible

## Error Handling

Common errors and solutions:

1. **Circular dependency detected**
   - Review task relationships
   - Remove conflicting dependencies

2. **Invalid state transition**
   - Check current task state
   - Ensure prerequisites are met

3. **Reminder time in past**
   - Adjust reminder offset
   - Check task due date accuracy

## Migration from Email-Only System

To migrate existing email-based tasks:

1. Run migration script to import emails
2. Use TaskAutomation to extract tasks
3. Review and adjust extracted data
4. Enable automation rules gradually

## Security Considerations

- Tasks inherit user permissions
- API requires authentication
- Sensitive data in custom_fields should be encrypted
- Audit trail cannot be modified

## Future Enhancements

Planned improvements:
- AI-powered task prioritization
- Natural language task creation
- Mobile app integration
- Advanced analytics dashboard
- Third-party calendar sync