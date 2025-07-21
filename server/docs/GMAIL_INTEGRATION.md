# Gmail Integration Guide

This guide explains how to set up Gmail integration in Tala AI, allowing users to connect their Gmail accounts without needing their own API keys.

## Overview

The Gmail integration provides:
- One-click OAuth connection
- Secure token storage with encryption
- Automatic token refresh
- Multiple account support
- Real-time email access

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Enable APIs and Services"
   - Search for "Gmail API"
   - Click "Enable"

### 2. Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Configure:
   - **Name**: Tala AI Gmail Integration
   - **Authorized JavaScript origins**: 
     - `http://localhost:3001` (development)
     - `https://your-domain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3001/api/email/callback/gmail` (development)
     - `https://your-domain.com/api/email/callback/gmail` (production)

### 3. Configure Environment Variables

Copy the example file:
```bash
cp .env.gmail.example .env.gmail
```

Update with your credentials:
```env
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3001/api/email/callback/gmail
ENCRYPTION_KEY=$(openssl rand -hex 32)
TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### 4. Run Database Migration

```bash
npm run migrate
```

This creates the `user_gmail_tokens` table for secure token storage.

## User Flow

### Connecting Gmail

1. User navigates to Email Settings
2. Clicks "Connect Gmail" button
3. Redirected to Google's OAuth consent screen
4. User authorizes Tala AI to access Gmail
5. Redirected back to Tala with success message
6. Gmail is now connected!

### Using Gmail Integration

Once connected, users can:
- View inbox messages
- Read full email content
- Mark emails as read/unread
- Search emails
- Manage multiple Gmail accounts

## Security Features

### Token Encryption
- All OAuth tokens are encrypted using AES-256-GCM
- Encryption keys are stored in environment variables
- Tokens are never exposed in logs or responses

### Secure Storage
- Tokens stored in PostgreSQL with RLS policies
- Users can only access their own tokens
- Automatic cleanup of expired tokens

### Token Refresh
- Access tokens auto-refresh before expiry
- Refresh tokens are long-lived
- Failed refreshes trigger reconnection prompt

## API Endpoints

### OAuth Flow
- `GET /api/email/connect/gmail` - Start OAuth flow
- `GET /api/email/callback/gmail` - OAuth callback

### Connection Management
- `GET /api/email/status` - Check connection status
- `POST /api/email/disconnect` - Disconnect account
- `GET /api/email/test/:email` - Test connection

### Email Operations
- `GET /api/email/inbox` - Fetch inbox messages
- `GET /api/email/message/:id` - Get message details
- `POST /api/email/message/:id/modify` - Modify message

## Frontend Integration

### React Component
```jsx
import EmailSettings from './components/EmailSettings';

// In your settings page
<EmailSettings />
```

### Connection Status
```javascript
// Check if Gmail is connected
const response = await fetch('/api/email/status');
const { connected, accounts } = await response.json();
```

### Connect Gmail
```javascript
// Redirect to OAuth flow
window.location.href = '/api/email/connect/gmail';
```

## Troubleshooting

### Common Issues

1. **"Access blocked" error**
   - Ensure app is in production mode in Google Cloud
   - Or add test users in OAuth consent screen

2. **Invalid redirect URI**
   - Check GMAIL_REDIRECT_URI matches exactly
   - Update in Google Cloud Console

3. **Token refresh fails**
   - User needs to reconnect
   - Check if refresh token was revoked

4. **Encryption errors**
   - Ensure ENCRYPTION_KEY is consistent
   - Don't change key after storing tokens

## Production Considerations

### Google Verification
For production use with 100+ users:
1. Submit app for Google verification
2. Provide privacy policy
3. Explain data usage
4. Complete security assessment

### Rate Limits
- Gmail API: 250 quota units per user per second
- Implement request queuing
- Cache frequently accessed data

### Monitoring
- Track connection success rates
- Monitor token refresh failures
- Alert on API quota usage

## Development Tools

### Test Connection
```bash
curl http://localhost:3001/api/email/test/user@gmail.com \
  -H "Cookie: your-auth-cookie"
```

### View Logs
```bash
tail -f logs/gmail-oauth.log
```

### Reset User Connection
```sql
UPDATE user_gmail_tokens 
SET is_active = false 
WHERE user_id = 'user-uuid' AND email_address = 'user@gmail.com';
```

## Support

For issues or questions:
1. Check error logs in server console
2. Verify environment variables
3. Test with different Gmail account
4. Check Google Cloud Console for API errors