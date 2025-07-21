# Real Email Integration Guide

## Overview
This guide provides step-by-step instructions to connect real email accounts (Gmail, Outlook, IMAP) and replace mock data with actual email functionality.

## Prerequisites

1. **Gmail Integration Requirements:**
   - Google Cloud Console account
   - OAuth 2.0 credentials
   - Gmail API enabled

2. **Environment Variables:**
   - Update `.env` file with real credentials
   - Configure OAuth redirect URLs

## Task List

### Phase 1: Gmail OAuth Setup (Recommended for Testing)

#### 1. Google Cloud Console Setup
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create a new project or select existing
- [ ] Enable Gmail API:
  - Navigate to "APIs & Services" > "Library"
  - Search for "Gmail API"
  - Click Enable

#### 2. Create OAuth 2.0 Credentials
- [ ] Go to "APIs & Services" > "Credentials"
- [ ] Click "Create Credentials" > "OAuth client ID"
- [ ] Configure OAuth consent screen:
  - App name: "Tala AI"
  - User support email: your email
  - Add scopes:
    - `https://www.googleapis.com/auth/gmail.readonly`
    - `https://www.googleapis.com/auth/gmail.modify`
- [ ] Create OAuth client:
  - Application type: Web application
  - Authorized redirect URIs: 
    - `http://localhost:3001/auth/google/callback`
    - `http://localhost:3001/api/email/oauth/callback`

#### 3. Update Backend Configuration
- [ ] Copy credentials from Google Cloud Console
- [ ] Update `/server/.env`:
  ```env
  # Gmail OAuth
  GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=your-client-secret
  GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
  
  # Email Settings
  EMAIL_PROVIDER=gmail
  EMAIL_SYNC_ENABLED=true
  EMAIL_WS_PORT=3002
  ```

#### 4. Install Required Dependencies
```bash
cd /Users/will/tala\ ai/tala_ai/server
npm install googleapis google-auth-library
```

### Phase 2: Update Backend Services

#### 5. Replace Mock GoogleOAuthService
- [ ] Update `/server/services/auth/GoogleOAuthService.js`:
  ```javascript
  import { google } from 'googleapis';
  import { OAuth2Client } from 'google-auth-library';
  
  class GoogleOAuthService {
    constructor() {
      this.oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    }
    
    // Real implementation methods...
  }
  ```

#### 6. Add Email Connection Endpoint
- [ ] Create `/server/routes/email-connect.js`:
  ```javascript
  router.get('/connect/gmail', (req, res) => {
    const authUrl = googleOAuthService.getAuthUrl();
    res.redirect(authUrl);
  });
  
  router.get('/oauth/callback', async (req, res) => {
    const { code } = req.query;
    const tokens = await googleOAuthService.getTokensFromCode(code);
    // Store tokens securely
    res.redirect('http://localhost:5173/email?connected=true');
  });
  ```

### Phase 3: Update Frontend

#### 7. Add Email Connection UI
- [ ] Update `/src/pages/Email.tsx` to add connection flow:
  ```typescript
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  // Check connection status on mount
  useEffect(() => {
    checkEmailConnection();
  }, []);
  
  const connectEmail = () => {
    window.location.href = 'http://localhost:3001/api/email/connect/gmail';
  };
  ```

#### 8. Create Email API Service
- [ ] Create `/src/services/emailService.ts`:
  ```typescript
  class EmailService {
    async fetchEmails(params: { maxResults?: number; query?: string }) {
      const response = await fetch('/api/email/messages', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      return response.json();
    }
    
    async sendToTala(emailId: string) {
      const response = await fetch(`/api/email/message/${emailId}/send-to-tala`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      return response.json();
    }
  }
  ```

### Phase 4: Implement Real Email Fetching

#### 9. Update Email.tsx to Use Real Data
- [ ] Replace mock data with API calls:
  ```typescript
  useEffect(() => {
    if (isConnected) {
      fetchRealEmails();
    }
  }, [isConnected]);
  
  const fetchRealEmails = async () => {
    try {
      const emails = await emailService.fetchEmails({ maxResults: 50 });
      setEmails(emails.messages);
    } catch (error) {
      toast.error('Failed to fetch emails');
    }
  };
  ```

#### 10. Implement Real Task Extraction
- [ ] Update handleSendToTala to use real API:
  ```typescript
  const handleSendToTala = async (email: EmailMessage) => {
    setIsProcessing(true);
    try {
      const result = await emailService.sendToTala(email.id);
      setExtractedTasks(result.tasks);
      toast.success(`Extracted ${result.tasks.length} tasks`);
    } catch (error) {
      toast.error('Failed to process email');
    } finally {
      setIsProcessing(false);
    }
  };
  ```

### Phase 5: Testing & Security

#### 11. Test OAuth Flow
- [ ] Click "Connect Gmail" button
- [ ] Complete Google OAuth consent
- [ ] Verify redirect back to app
- [ ] Check tokens are stored securely

#### 12. Test Email Operations
- [ ] Fetch inbox emails
- [ ] Search emails
- [ ] View email details
- [ ] Send email to Tala for task extraction
- [ ] Verify tasks are created

#### 13. Security Checklist
- [ ] Tokens encrypted in database
- [ ] HTTPS in production
- [ ] Rate limiting on API endpoints
- [ ] User-specific email access only
- [ ] Refresh token rotation

### Phase 6: Production Deployment

#### 14. Production OAuth Setup
- [ ] Update Google Cloud Console with production URLs
- [ ] Add production redirect URI: `https://yourdomain.com/auth/google/callback`
- [ ] Submit for OAuth verification if needed

#### 15. Environment Configuration
- [ ] Set production environment variables
- [ ] Configure secure token storage
- [ ] Enable HTTPS
- [ ] Set up monitoring

## Quick Test Setup (Development)

For quick testing with a real Gmail account:

1. **Use Google's OAuth Playground:**
   - Go to https://developers.google.com/oauthplayground/
   - Select Gmail API v1 scopes
   - Authorize and get access token
   - Use token for testing

2. **Create Test Endpoint:**
   ```javascript
   // In /server/test-real-gmail.js
   const testToken = 'YOUR_TEST_TOKEN';
   const emails = await gmail.users.messages.list({
     userId: 'me',
     maxResults: 10
   });
   console.log(emails.data);
   ```

## Alternative: IMAP Connection (Simpler Setup)

If OAuth is too complex for testing, use IMAP:

1. **Enable IMAP in Gmail:**
   - Gmail Settings > Forwarding and POP/IMAP
   - Enable IMAP

2. **Generate App Password:**
   - Google Account Settings > Security
   - 2-Step Verification > App passwords
   - Generate password for "Mail"

3. **Update .env:**
   ```env
   EMAIL_PROVIDER=imap
   IMAP_HOST=imap.gmail.com
   IMAP_PORT=993
   IMAP_USER=your-email@gmail.com
   IMAP_PASS=your-app-password
   ```

## Troubleshooting

### Common Issues:

1. **"Unauthorized" errors:**
   - Check CLIENT_ID and CLIENT_SECRET
   - Verify redirect URI matches exactly
   - Ensure scopes are correct

2. **"Token expired" errors:**
   - Implement token refresh logic
   - Check token expiry handling

3. **Rate limiting:**
   - Gmail API has quotas
   - Implement caching
   - Batch operations when possible

## Next Steps

After completing real email integration:

1. Add support for multiple email accounts
2. Implement email filtering rules
3. Add attachment handling
4. Create email templates for responses
5. Set up webhook for real-time email updates