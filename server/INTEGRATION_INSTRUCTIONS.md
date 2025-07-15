# Email-to-Task Integration Instructions

## Adding Email-to-Task Routes to Your Server

To integrate the email-to-task conversion functionality into your existing server, add the following to your `server.js` file:

### 1. Import the Routes

Add this import near the top of your server.js file (around line 40 with other route imports):

```javascript
// Import Email-to-Task routes
import emailTaskRoutes from './routes/email-tasks.js';
```

### 2. Mount the Routes

Add this line after your other API route declarations (around line 700):

```javascript
// Email to Task Conversion Routes
app.use('/api/email-tasks', emailTaskRoutes);
```

### 3. Import Task Routes (if using native task management)

```javascript
// Task Management Routes
import taskRoutes from './routes/tasks.js';
app.use('/api/tasks', taskRoutes);
```

### 4. WebSocket Server (Optional)

If you want real-time updates, add this after your Express server starts:

```javascript
// Start WebSocket server for email-to-task updates
if (process.env.EMAIL_WS_PORT) {
  console.log(`📡 WebSocket server for email updates on port ${process.env.EMAIL_WS_PORT}`);
}
```

### 5. Environment Variables

Add these to your `.env` file:

```env
# Email to Task WebSocket Port
EMAIL_WS_PORT=3002

# Task Management Database (if using separate DB)
TASK_DB_URL=your_task_database_url
```

## Testing the Integration

### 1. Basic Test

Run the simple CommonJS test:
```bash
node test-email-task-simple.cjs
```

### 2. Full Integration Test

Run the complete integration test:
```bash
node test-email-task-integration.js
```

### 3. Demo with Mock Data

Run the comprehensive demo:
```bash
node test-email-to-task.js
```

## API Endpoints Added

After integration, you'll have these new endpoints:

### Email-to-Task Conversion
- `POST /api/email-tasks/send-to-tala` - Convert email to tasks
- `POST /api/email-tasks/batch-send-to-tala` - Batch process emails
- `POST /api/email-tasks/confirm/:sessionId` - Confirm task creation
- `GET /api/email-tasks/status/:sessionId` - Get conversion status
- `POST /api/email-tasks/cancel/:sessionId` - Cancel conversion
- `POST /api/email-tasks/quick-action` - Quick task creation
- `GET /api/email-tasks/actions` - Get available actions
- `POST /api/email-tasks/extract` - Extract tasks (preview only)
- `GET /api/email-tasks/stats` - Get conversion statistics
- `POST /api/email-tasks/feedback` - Record user feedback
- `GET /api/email-tasks/accuracy` - Get accuracy metrics
- `GET /api/email-tasks/websocket` - WebSocket connection info

### Task Management (if enabled)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:taskId` - Get task
- `PUT /api/tasks/:taskId` - Update task
- `DELETE /api/tasks/:taskId` - Delete task
- `GET /api/tasks` - List tasks with filters
- `POST /api/tasks/:taskId/assignments` - Assign task
- `POST /api/tasks/:taskId/reminders` - Create reminder
- `POST /api/tasks/:taskId/transition` - Change task status
- `GET /api/tasks/stats` - Get task statistics

## Quick Start Example

Here's a minimal example to test if the integration is working:

```javascript
// test-integration.js
const axios = require('axios');

async function quickTest() {
    try {
        // Check if email-tasks endpoints are available
        const response = await axios.get('http://localhost:3001/api/email-tasks/actions');
        console.log('✅ Email-to-Task API is working!');
        console.log('Available actions:', response.data.actions.length);
    } catch (error) {
        console.error('❌ Email-to-Task API not found. Did you add the routes?');
    }
}

quickTest();
```

## Troubleshooting

### Common Issues

1. **404 Not Found on API calls**
   - Make sure you've imported and mounted the routes
   - Check that the server has restarted after changes
   - Verify the API path is correct (`/api/email-tasks/...`)

2. **WebSocket connection failed**
   - Ensure EMAIL_WS_PORT is set in .env
   - Check that port 3002 is not in use
   - Verify firewall allows WebSocket connections

3. **Mock data in tests**
   - The simple test uses mock data for demonstration
   - To test with real emails, implement EmailManager.getEmail()
   - Connect to your actual email storage system

4. **Task creation fails**
   - Ensure database is connected
   - Check that task tables exist (run migration)
   - Verify user authentication is working

## Next Steps

1. Connect your EmailManager to retrieve real emails
2. Implement authentication middleware if not already done
3. Set up the task database tables using the migration
4. Configure WebSocket for real-time updates
5. Add the frontend UI components for "Send to Tala" button

## Frontend Integration

Add a "Send to Tala" button to your email interface:

```javascript
// Example React component
async function handleSendToTala(emailId) {
    try {
        const response = await fetch('/api/email-tasks/send-to-tala', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailId })
        });
        
        const result = await response.json();
        
        if (result.requiresConfirmation) {
            // Show task preview UI
            showTaskPreview(result.sessionId);
        }
    } catch (error) {
        console.error('Send to Tala failed:', error);
    }
}
```