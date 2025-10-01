# Credit System Fix Guide

## Problem Summary
The credit system is showing 5000 credits but not decreasing when using the API. The chat endpoint returns a 500 error, likely due to:
1. Missing Supabase credit tables
2. Middleware expecting database tables that don't exist
3. Credit consumption failing silently

## Immediate Fix (Get Chat Working Now)

### Option 1: Quick Bypass (Recommended for immediate use)
```bash
cd server
node fixes/quickPatch.js
npm run dev
```

This will:
- Disable credit checks temporarily (CREDITS_ENABLED=false)
- Enable mock authentication
- Allow the chat endpoint to work without database

### Option 2: Manual Bypass
Add to your `server/.env`:
```env
CREDITS_ENABLED=false
MOCK_AUTH=true
```

Then restart the server.

## Permanent Fix (Enable Full Credit System)

### Step 1: Create Database Tables
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `server/migrations/001_create_credit_tables.sql`
4. Execute the SQL

### Step 2: Verify Tables
Run the diagnostic script:
```bash
cd server
node diagnostics/testCreditSystem.js YOUR_USER_ID
```

### Step 3: Enable Credits
Update `server/.env`:
```env
CREDITS_ENABLED=true
```

### Step 4: Test Credit Flow
```bash
# Test health endpoint
curl http://localhost:3001/api/credits/health

# Test chat endpoint with credits
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -d '{"message": "Hello"}'
```

## Troubleshooting

### Error: "relation does not exist"
**Cause**: Credit tables haven't been created in Supabase
**Fix**: Run the migration SQL in Supabase dashboard

### Error: "Insufficient credits" 
**Cause**: User has no credits or credits are depleted
**Fix**: 
1. Check user credits: `node diagnostics/testCreditSystem.js USER_ID`
2. Add credits manually in database if needed

### Error: "Authentication required"
**Cause**: No user session or API key
**Fix**: 
1. Enable MOCK_AUTH=true for development
2. Or implement proper authentication

### Credits not decreasing
**Cause**: Credit consumption failing after response
**Fix**: 
1. Check if tables exist
2. Verify user has write permissions
3. Check server logs for consumption errors

## Architecture Overview

### Credit Flow
1. Request arrives at endpoint
2. `authenticate` middleware validates user
3. `requireCredits` middleware checks balance
4. Request processes
5. On success, credits are deducted
6. Response includes credit info

### Key Files
- `services/creditSystem.js` - Core credit logic
- `middleware/creditsMiddleware.js` - Request interception
- `migrations/001_create_credit_tables.sql` - Database schema
- `diagnostics/testCreditSystem.js` - Testing tool

### Credit Costs
- Chat message: 10-150 credits (based on model)
- Document upload: 50 credits
- Document search: 5 credits
- Email operations: 30-50 credits

## Development Tips

### Testing Without Credits
Set `CREDITS_ENABLED=false` in `.env` to bypass all credit checks during development.

### Mock Credits
The system returns default 5000 credits when tables don't exist, allowing development without database.

### Monitoring Credits
```javascript
// In your frontend
const response = await fetch('/api/chat', {...});
const data = await response.json();
console.log('Credits used:', data._credits?.cost);
console.log('New balance:', data._credits?.newBalance);
```

## Production Checklist
- [ ] Run migration in production Supabase
- [ ] Set CREDITS_ENABLED=true
- [ ] Disable MOCK_AUTH
- [ ] Configure proper authentication
- [ ] Set up credit purchase flow
- [ ] Monitor credit consumption
- [ ] Set up alerts for low credits
- [ ] Implement credit reset cron job

## Support Commands

### Check System Status
```bash
cd server
node diagnostics/testCreditSystem.js
```

### Apply Quick Fix
```bash
cd server
node fixes/quickPatch.js
```

### Run Migration
```bash
cd server
node migrations/runMigration.js
```

### Test Endpoints
```bash
# Health check
curl http://localhost:3001/api/credits/health

# Status check  
curl http://localhost:3001/api/credits/status \
  -H "x-user-id: test_user_123"

# Test chat
curl -X POST http://localhost:3001/api/chat/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'
```