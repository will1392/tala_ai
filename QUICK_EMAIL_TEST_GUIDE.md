# Quick Email Testing Guide

## What's Ready Now

1. **Frontend UI** ✅
   - Email tab in sidebar
   - Gmail connection screen
   - Email list and task extraction UI
   - Test mode for quick demo

2. **Backend API** ✅
   - Email-to-task conversion endpoints
   - Task extraction engine
   - WebSocket support for real-time updates

## Quick Test Options

### Option 1: Test Mode (Easiest - Already Working!)
1. Click the Email tab in your app
2. Click "Quick Demo (Test Mode)"
3. Browse sample emails and test task extraction

### Option 2: Real Gmail - Simple Setup
1. **Get Gmail App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Sign in and generate an app password for "Mail"
   
2. **Update Backend Config:**
   ```bash
   cd /Users/will/tala\ ai/tala_ai/server
   
   # Edit .env file
   echo "GMAIL_USER=your-email@gmail.com" >> .env
   echo "GMAIL_APP_PASSWORD=your-16-char-password" >> .env
   ```

3. **Test Connection:**
   ```bash
   # Edit test-real-email-simple.js with your credentials
   node test-real-email-simple.js
   ```

### Option 3: Full OAuth Setup (Production-Ready)
Follow the detailed guide in `REAL_EMAIL_INTEGRATION_GUIDE.md`

## Current Architecture

```
Frontend (React)          Backend (Node.js)         Services
    │                          │                        │
    ├─ Email.tsx ──────────────┼─> /api/email-tasks ───┼─> EmailManager
    ├─ GmailConnect.tsx        │                        ├─> EmailParser  
    └─ Button clicks ──────────┼─> WebSocket :3002 ────┼─> TaskExtractor
                               │                        └─> AI Processing
```

## API Endpoints Ready

- `POST /api/email-tasks/send-to-tala` - Process email → tasks
- `GET /api/email-tasks/:taskId/status` - Check processing status  
- `GET /api/email-tasks/suggestions/:emailId` - Get AI suggestions
- `POST /api/email-tasks/feedback` - Improve AI learning

## Next Steps for Real Email

1. **Minimal Changes Needed:**
   - Replace mock data in Email.tsx with API calls
   - Add real OAuth flow to GmailConnect.tsx
   - Update EmailManager.js to use real Gmail API

2. **Security Considerations:**
   - Store tokens encrypted
   - Use HTTPS in production
   - Implement token refresh

## Test Now!

The app is ready to test in demo mode. Just:
1. Open http://localhost:5173/
2. Click Email tab
3. Click "Quick Demo"
4. Try the "Send to Tala" feature!