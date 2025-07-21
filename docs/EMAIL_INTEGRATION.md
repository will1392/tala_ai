# Email Integration Documentation

## Overview

The Tala AI email integration provides a complete email management system with support for multiple providers, AI-powered analysis, and task extraction.

## Features

- **Multi-Provider Support**: Gmail (OAuth), Outlook (planned), IMAP, Mock (testing)
- **Email Management**: View, search, filter, and organize emails
- **AI Analysis**: Send emails to Tala AI for intelligent analysis and task extraction
- **Bulk Operations**: Mark read/unread, archive, delete multiple emails
- **Real-time Sync**: Automatic and manual email synchronization
- **Rich Email Viewer**: HTML content, attachments, and metadata display
- **Email Composer**: Full-featured email composition with formatting

## Architecture

### Backend Components

1. **EmailManager** (`server/services/email/EmailManager.js`)
   - Central service for email operations
   - Provider abstraction layer
   - Caching and connection management

2. **EmailParser** (`server/services/email/EmailParser.js`)
   - Email content parsing and sanitization
   - Entity extraction (emails, phones, dates, etc.)
   - AI-powered analysis integration

3. **EmailSyncService** (`server/services/email/EmailSyncService.js`)
   - Background synchronization
   - Queue management
   - Incremental and full sync support

4. **GoogleOAuthService** (`server/services/auth/GoogleOAuthService.js`)
   - Gmail OAuth flow implementation
   - Token management and encryption
   - Automatic token refresh

### Frontend Components

1. **EmailInbox** (`src/components/email/EmailInbox.jsx`)
   - Main email interface
   - Account switching
   - Search and filtering

2. **EmailList** (`src/components/email/EmailList.jsx`)
   - Email list with infinite scroll
   - Selection and bulk actions
   - Real-time updates

3. **EmailViewer** (`src/components/email/EmailViewer.jsx`)
   - Full email display
   - AI analysis results
   - Action buttons

4. **EmailSidebar** (`src/components/email/EmailSidebar.jsx`)
   - Navigation and folders
   - Account management
   - Labels and filters

5. **EmailComposer** (`src/components/email/EmailComposer.jsx`)
   - Email composition
   - Rich text formatting
   - File attachments

## Database Schema

```sql
-- User email accounts
user_email_accounts
  - id (UUID)
  - user_id (UUID)
  - provider (VARCHAR)
  - email_address (VARCHAR)
  - settings (JSONB)
  - is_active (BOOLEAN)
  - connected_at (TIMESTAMP)

-- Email sync status
email_sync_status
  - id (UUID)
  - user_id (UUID)
  - email_account_id (UUID)
  - sync_status (VARCHAR)
  - last_successful_sync (TIMESTAMP)
  - message_count (INTEGER)
  - unread_count (INTEGER)

-- Analyzed emails
analyzed_emails
  - id (UUID)
  - user_id (UUID)
  - email_id (VARCHAR)
  - provider (VARCHAR)
  - subject (TEXT)
  - analysis_result (JSONB)
  - tasks_extracted (JSONB)
  - entities_extracted (JSONB)

-- Email tasks
email_tasks
  - id (UUID)
  - user_id (UUID)
  - email_id (VARCHAR)
  - task_title (TEXT)
  - due_date (DATE)
  - priority (VARCHAR)
  - status (VARCHAR)

-- Email attachments
email_attachments
  - id (UUID)
  - analyzed_email_id (UUID)
  - filename (VARCHAR)
  - mime_type (VARCHAR)
  - size_bytes (BIGINT)

-- Email sync queue
email_sync_queue
  - id (UUID)
  - user_id (UUID)
  - email_account_id (UUID)
  - sync_type (VARCHAR)
  - priority (INTEGER)
  - status (VARCHAR)
```

## API Endpoints

### Provider Management
- `GET /api/email/providers` - List available providers
- `POST /api/email/connect` - Initiate provider connection
- `GET /api/email/callback/:provider` - OAuth callback handler
- `GET /api/email/accounts` - Get user's email accounts
- `DELETE /api/email/disconnect` - Disconnect email account

### Email Operations
- `GET /api/email/inbox` - Fetch inbox messages
- `GET /api/email/message/:id` - Get full message details
- `POST /api/email/message/:id/modify` - Modify message (labels, read status)
- `POST /api/email/message/:id/send-to-tala` - Analyze email with AI
- `GET /api/email/search` - Search emails

### Sync Operations
- `GET /api/email/sync/status` - Get sync status
- `POST /api/email/sync` - Trigger manual sync

## Setup Instructions

### 1. Gmail OAuth Setup

1. Create a Google Cloud Project
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `http://localhost:3001/api/email/callback/gmail` (development)
   - `https://yourdomain.com/api/email/callback/gmail` (production)
5. Set environment variables:
   ```env
   GMAIL_CLIENT_ID=your-client-id
   GMAIL_CLIENT_SECRET=your-client-secret
   GMAIL_REDIRECT_URI=http://localhost:3001/api/email/callback/gmail
   ```

### 2. Database Setup

Run the migration:
```bash
psql -U your_user -d your_database -f server/db/migrations/create_email_integration_tables.sql
```

### 3. Testing

Use the mock provider for testing without real email accounts:

```javascript
// Test with mock provider
node server/test-email-integration.js
```

## Usage Examples

### Connect Gmail Account

```javascript
// Frontend
const result = await emailAPI.initiateConnection('gmail', {
  returnUrl: '/dashboard'
});
// User is redirected to Google OAuth
```

### Fetch Inbox

```javascript
const inbox = await emailAPI.fetchInbox({
  email: 'user@gmail.com',
  provider: 'gmail',
  maxResults: 20,
  query: 'is:unread'
});
```

### Analyze Email

```javascript
const analysis = await emailAPI.analyzeEmail(messageId, {
  email: 'user@gmail.com',
  provider: 'gmail'
});
// Returns: { summary, tasks, entities, priority }
```

### Search Emails

```javascript
const results = await emailAPI.searchEmails({
  query: 'booking confirmation',
  email: 'user@gmail.com',
  limit: 10
});
```

## Security Considerations

1. **Token Encryption**: All OAuth tokens are encrypted before storage
2. **HTTPS Required**: OAuth callbacks require HTTPS in production
3. **Token Refresh**: Automatic token refresh for expired tokens
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Input Sanitization**: All HTML content is sanitized before display

## Troubleshooting

### Common Issues

1. **OAuth Error: redirect_uri_mismatch**
   - Ensure redirect URI in Google Cloud Console matches exactly
   - Check for trailing slashes

2. **Failed to fetch inbox**
   - Check if tokens are valid
   - Verify Gmail API is enabled
   - Check scopes include gmail.readonly

3. **Sync not working**
   - Check database connection
   - Verify sync queue processor is running
   - Check for sync errors in email_sync_status table

### Debug Mode

Enable debug logging:
```env
EMAIL_DEBUG=true
```

### Test Mode

Run with test authentication:
```env
ALLOW_TEST_AUTH=true
node server/server.js
```

## Future Enhancements

1. **Outlook Integration**: Complete OAuth implementation
2. **IMAP Support**: Generic IMAP/SMTP integration
3. **Email Templates**: Save and reuse email templates
4. **Advanced Filters**: Complex filtering and rules
5. **Batch Operations**: Process multiple emails efficiently
6. **Email Scheduling**: Send emails at scheduled times
7. **Attachment Management**: Direct attachment uploads to cloud storage
8. **Email Analytics**: Track email engagement and patterns