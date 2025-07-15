# Email Integration Setup Guide

## Overview

This guide helps you connect the email-to-task conversion system with your existing email infrastructure.

## Integration Points

### 1. Email API Endpoint Mapping

If you have existing email endpoints like `/api/email/message/{emailId}`, you can add a bridge to the email-to-task system:

```javascript
// In your existing email routes file
app.post('/api/email/message/:emailId/send-to-tala', async (req, res) => {
    try {
        // Get the email data from your system
        const email = await EmailManager.getEmail(req.params.emailId);
        
        // Forward to the email-to-task API
        const response = await axios.post(
            'http://localhost:3001/api/email-tasks/send-to-tala',
            {
                emailId: email.id,
                options: req.body.options || {}
            },
            {
                headers: {
                    'x-user-id': req.userId || req.headers['x-user-id']
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.message
        });
    }
});
```

### 2. Email Manager Integration

The email-to-task system expects an EmailManager service. Create or update yours:

```javascript
// services/EmailManager.js
export class EmailManager {
    async getEmail(emailId) {
        // Fetch from your database/API
        const email = await db.query('SELECT * FROM emails WHERE id = ?', [emailId]);
        
        // Return in expected format
        return {
            id: email.id,
            subject: email.subject,
            from: {
                name: email.sender_name,
                address: email.sender_email
            },
            to: email.recipients,
            date: email.created_at,
            body: email.body,
            threadId: email.thread_id,
            attachments: email.attachments || []
        };
    }
    
    async getThread(threadId) {
        // Fetch all emails in thread
        const emails = await db.query(
            'SELECT * FROM emails WHERE thread_id = ? ORDER BY created_at',
            [threadId]
        );
        return emails;
    }
    
    async getInbox(userId, filters = {}) {
        // Fetch user's emails
        const query = 'SELECT * FROM emails WHERE user_id = ? ORDER BY created_at DESC';
        const emails = await db.query(query, [userId]);
        
        return {
            messages: emails,
            total: emails.length
        };
    }
}

export default new EmailManager();
```

### 3. Connect to Email-to-Task Converter

Update the EmailToTaskConverter to use your EmailManager:

```javascript
// In EmailToTaskConverter.js constructor
import EmailManager from '../services/EmailManager.js';

constructor(options = {}) {
    this.emailManager = options.emailManager || EmailManager;
    // ... rest of constructor
}
```

## API Endpoint Options

### Option 1: Use Email-to-Task API Directly

```javascript
// Frontend code
async function sendEmailToTala(emailId) {
    const response = await fetch('/api/email-tasks/send-to-tala', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            emailId: emailId,
            options: {
                requireConfirmation: true
            }
        })
    });
    
    return response.json();
}
```

### Option 2: Bridge Your Existing Email API

```javascript
// Add to your email routes
router.post('/message/:emailId/send-to-tala', async (req, res) => {
    // Your existing auth/validation
    
    // Get email data
    const email = await getEmailById(req.params.emailId);
    
    // Convert to task format and forward
    const converter = new EmailToTaskConverter();
    const result = await converter.convertEmailToTasks(email);
    
    res.json(result);
});
```

## Frontend Integration

### Add "Send to Tala" Button

```jsx
// React component example
function EmailActions({ email }) {
    const [loading, setLoading] = useState(false);
    
    const handleSendToTala = async () => {
        setLoading(true);
        try {
            const result = await sendEmailToTala(email.id);
            
            if (result.requiresConfirmation) {
                // Show task preview modal
                showTaskPreview(result.sessionId);
            } else {
                // Tasks created automatically
                showSuccess(`Created ${result.taskCount} tasks`);
            }
        } catch (error) {
            showError('Failed to create tasks');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <button 
            onClick={handleSendToTala}
            disabled={loading}
            className="send-to-tala-btn"
        >
            {loading ? 'Processing...' : 'Send to Tala'}
        </button>
    );
}
```

### WebSocket for Real-time Updates

```javascript
// Connect to WebSocket for progress updates
const ws = new WebSocket('ws://localhost:3002');

ws.onopen = () => {
    // Subscribe to session updates
    ws.send(JSON.stringify({
        type: 'subscribe',
        sessionId: sessionId
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'progress':
            updateProgressBar(data.progress);
            showStatus(data.message);
            break;
            
        case 'task.created':
            addTaskToList(data.task);
            break;
            
        case 'error':
            showError(data.message);
            break;
    }
};
```

## Database Schema (If Using Separate Task DB)

```sql
-- Tasks table
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    due_date TIMESTAMP,
    created_by VARCHAR(36),
    assigned_to VARCHAR(36),
    source_email_id VARCHAR(36),
    thread_id VARCHAR(36),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task assignments
CREATE TABLE task_assignments (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) REFERENCES tasks(id),
    user_id VARCHAR(36),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(36)
);

-- Task reminders
CREATE TABLE task_reminders (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) REFERENCES tasks(id),
    reminder_time TIMESTAMP NOT NULL,
    reminder_type VARCHAR(20),
    message TEXT,
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Your Integration

### 1. Test Basic Connection

```bash
node test-integration-quick.js
```

### 2. Test Full Flow

```bash
node test-email-api-endpoints.js
```

### 3. Test with Your Email Data

```javascript
// custom-test.js
const emailData = {
    id: 'your-real-email-id',
    subject: 'Real email subject',
    // ... your email format
};

// Test with your data
testWithRealEmail(emailData);
```

## Troubleshooting

### Issue: 404 Not Found

1. Check server.js has the routes added:
```javascript
import emailTaskRoutes from './routes/email-tasks.js';
app.use('/api/email-tasks', emailTaskRoutes);
```

2. Restart the server after changes

### Issue: Email Not Found

1. Implement EmailManager.getEmail() method
2. Ensure email ID format matches your system
3. Check authentication/permissions

### Issue: Tasks Not Created

1. Check task database connection
2. Verify user has permissions
3. Review error logs for details

### Issue: WebSocket Not Connecting

1. Ensure EMAIL_WS_PORT is set in .env
2. Check firewall allows WebSocket
3. Verify port is not in use

## Next Steps

1. **Connect EmailManager**: Implement the getEmail() method to fetch from your database
2. **Add Authentication**: Ensure proper user context is passed
3. **Configure Task Storage**: Set up task database or use existing
4. **Add UI Components**: Create "Send to Tala" button in email interface
5. **Test Integration**: Run tests with real email data
6. **Monitor Usage**: Track conversion success rates

## Support

For issues or questions:
- Check EMAIL_TO_TASK_GUIDE.md for detailed documentation
- Review test files for usage examples
- Check server logs for error details