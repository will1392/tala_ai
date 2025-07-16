# Gmail OAuth Persistent Storage Implementation

## Overview

This implementation provides persistent storage for Gmail OAuth tokens, ensuring users don't have to reconnect every time they visit the email tab or when the server restarts.

## Components

### 1. TokenStorageService (`/services/auth/TokenStorageService.js`)

A dedicated service for managing OAuth token storage with the following features:

- **Encrypted Storage**: All tokens are encrypted using AES-256-GCM before storage
- **Database Persistence**: Uses the `integration_configs` table in the database
- **Token Refresh Management**: Automatically detects when tokens need refreshing
- **User Association**: Links tokens to specific user IDs
- **Caching**: Implements intelligent caching for performance

Key methods:
- `saveGmailTokens(userId, tokens, userInfo)` - Save or update Gmail tokens
- `getGmailTokens(userId)` - Retrieve and decrypt tokens
- `updateGmailTokens(userId, newTokens)` - Update tokens after refresh
- `removeGmailIntegration(userId)` - Disconnect Gmail
- `isGmailConnected(userId)` - Check connection status

### 2. Updated OAuth Routes (`/routes/email-connect.js`)

Modified endpoints to use persistent storage:

- **OAuth Callback** (`/callback/gmail`): Now saves tokens to database instead of session
- **List Messages** (`/messages`): Retrieves tokens from database and handles automatic refresh
- **Get Message** (`/message/:id`): Uses persistent tokens with refresh support
- **Connection Status** (`/status`): New endpoint to check Gmail connection status
- **Disconnect** (`/disconnect`): New endpoint to remove Gmail integration

### 3. Database Schema

Uses the existing `integration_configs` table:

```sql
CREATE TABLE integration_configs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    integration_id VARCHAR(50) NOT NULL,
    config JSON NOT NULL, -- Encrypted token data
    status VARCHAR(20) DEFAULT 'inactive',
    enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Security Features

1. **Encryption**: All OAuth tokens are encrypted using the application's master encryption key
2. **Token Refresh**: Automatically refreshes access tokens when they're about to expire
3. **Error Handling**: Gracefully handles authentication failures and prompts for reconnection
4. **Soft Delete**: Integrations are soft-deleted to maintain audit trail

## Usage Flow

1. **Initial Connection**:
   - User clicks "Connect Gmail" 
   - OAuth flow initiated with user ID in state
   - Tokens received and encrypted
   - Stored in database with user association

2. **Subsequent Requests**:
   - Tokens retrieved from database
   - Decrypted for use
   - Automatic refresh if needed
   - Updated tokens saved back to database

3. **Disconnection**:
   - User can disconnect via the new endpoint
   - Integration marked as deleted
   - Cache invalidated

## API Endpoints

### Check Connection Status
```
GET /api/email/status
Headers: x-user-id: <user-id>

Response:
{
  "connected": true,
  "email": "user@gmail.com",
  "needsRefresh": false
}
```

### Disconnect Gmail
```
DELETE /api/email/disconnect
Headers: x-user-id: <user-id>

Response:
{
  "success": true,
  "message": "Gmail disconnected successfully"
}
```

## Environment Variables

Ensure these are set:
- `ENCRYPTION_KEY` - Master key for token encryption
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL

## Migration Notes

- Session-based tokens are no longer used
- Existing sessions will need to reconnect once
- All new connections automatically use persistent storage

## Benefits

1. **Persistent Authentication**: Tokens survive server restarts
2. **Multi-Device Support**: Same Gmail connection across devices
3. **Automatic Token Management**: Handles refresh automatically
4. **Secure Storage**: Encrypted at rest
5. **Better User Experience**: No repeated reconnections

## Testing

1. Connect Gmail account
2. Restart server
3. Access email tab - should still be connected
4. Wait for token expiry - should auto-refresh
5. Disconnect and reconnect - should work seamlessly