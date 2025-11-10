# Testing the Hook Generation Endpoint

## Quick Start

### 1. Start the Server

```bash
cd server
node server.js
```

The server should start on port 3001 (or the port specified in `.env`).

### 2. Run the Test Script

```bash
cd server
./test-hooks-endpoint.sh
```

## Expected Results

### Scenario 1: Credits Disabled (Testing Mode)

Set in `server/.env`:
```
CREDITS_ENABLED=false
```

Expected output:
```
✅ Server is running
✅ OPTIONS request successful
✅ POST request successful!
   Response: { success: true, hooks: [...], metadata: {...} }
✅ Validation error returned correctly
```

### Scenario 2: Credits Enabled (Production Mode)

Set in `server/.env`:
```
CREDITS_ENABLED=true
# or omit - credits are enabled by default
```

Expected output:
```
✅ Server is running
✅ OPTIONS request successful
⚠️  401 Unauthorized - Authentication required
   OR
⚠️  402 Payment Required - Insufficient credits
```

This is **correct behavior** - the endpoint is working but requires valid authentication and sufficient credits.

### Scenario 3: 405 Error (Bug Present)

If you see:
```
❌ 405 Method Not Allowed - This is the bug!
```

This means the endpoint is not accepting POST requests. The fix in `server.js` should resolve this.

## Manual Testing

### Test with curl

```bash
# Test OPTIONS request
curl -X OPTIONS http://localhost:3001/api/hooks/generate \
  -H "Origin: http://localhost:5173" \
  -v

# Test POST request
curl -X POST http://localhost:3001/api/hooks/generate \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "targetAudience": "Luxury travelers seeking authentic experiences",
    "offering": "European river cruise vacation",
    "painPoints": [
      "Worried about crowded tourist destinations",
      "Concerned about planning complex multi-city itineraries"
    ],
    "desiredOutcome": "Book a stress-free luxury river cruise",
    "marketingChannels": ["Paid Ads"],
    "tone": "Bold and direct"
  }'
```

### Test with Frontend

1. Start the backend server:
   ```bash
   cd server
   node server.js
   ```

2. Start the frontend dev server:
   ```bash
   npm run dev
   # Runs on http://localhost:5173
   ```

3. Navigate to `/hook-generator` in your browser

4. Fill out the form and click "Generate Hooks"

Expected behavior:
- If credits are disabled: Hooks should generate successfully
- If credits are enabled: Should show authentication or credit requirement message
- Should **NOT** show 405 error

## Troubleshooting

### "Server is not running"

Make sure the server is started:
```bash
cd server
node server.js
```

Check the port in `server/.env`:
```
PORT=3001
```

### "401 Unauthorized"

This is expected behavior when credits are enabled. To test without authentication:
```bash
# In server/.env
CREDITS_ENABLED=false
```

Then restart the server.

### "402 Payment Required"

The test user needs credits. Options:
1. Disable credits (see above)
2. Use a user with credits
3. Make the user a super admin (unlimited credits)

### "Connection refused"

Check if another process is using port 3001:
```bash
lsof -ti:3001
```

Kill the process if needed:
```bash
kill -9 $(lsof -ti:3001)
```

### Still Getting 405 Error

1. Verify the changes were applied to `server.js`:
   ```bash
   grep -A2 "app.options('/api/hooks/generate'" server/server.js
   ```
   
   Should show:
   ```javascript
   app.options('/api/hooks/generate', (req, res) => {
     res.status(204).end();
   });
   ```

2. Check that the POST handler exists:
   ```bash
   grep "app.post('/api/hooks/generate'" server/server.js
   ```
   
   Should show:
   ```javascript
   app.post('/api/hooks/generate', optionalAuth, requireCredits('hook_generation'), asyncHandler(async (req, res) => {
   ```

3. Verify the server restarted after changes:
   - Stop the server (Ctrl+C)
   - Start it again: `node server.js`

4. Check server logs for errors:
   - Look for the line: `🚀 Tala AI Backend Server running on port 3001`
   - Look for any error messages during startup

## Production Testing

To test the deployed production endpoint:

```bash
# Set the production URL
export API_BASE=https://your-production-api.vercel.app

# Run the test script
./test-hooks-endpoint.sh
```

Or with curl:
```bash
curl -X POST https://your-production-api.vercel.app/api/hooks/generate \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{"targetAudience":"Luxury travelers","offering":"River cruise","painPoints":["Worried about crowds"]}'
```

## Environment Variables

Key environment variables for testing:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Credits System
CREDITS_ENABLED=false  # Set to false for testing without credits

# Authentication (for development)
MOCK_AUTH=true  # Enables mock authentication in development

# CORS (important for frontend-backend communication)
CORS_ORIGIN=http://localhost:5173

# OpenAI (required for hook generation)
OPENAI_API_KEY=your-api-key

# Qdrant (required for RAG)
QDRANT_URL=your-qdrant-url
QDRANT_API_KEY=your-qdrant-key
```

## Test Script Options

The test script accepts environment variables:

```bash
# Test against a different server
API_BASE=http://localhost:3002 ./test-hooks-endpoint.sh

# Use a specific user ID
TEST_USER_ID=my-user-id ./test-hooks-endpoint.sh

# Combine both
API_BASE=https://prod-api.com TEST_USER_ID=prod-user ./test-hooks-endpoint.sh
```

## Success Indicators

The fix is working when:

✅ OPTIONS requests return 204 or 200  
✅ CORS headers are present in OPTIONS response  
✅ POST requests are accepted (not 405)  
✅ POST with valid data returns 200 (or 401/402 if auth/credits required)  
✅ POST with invalid data returns 400 with validation error  
✅ Frontend Hook Generator works without 405 errors  

## Next Steps

After confirming the fix works locally:

1. Commit the changes:
   ```bash
   git add server/server.js server/middleware/creditsMiddleware.js
   git commit -m "Fix Hook Agent 405 error - add OPTIONS handler and enhanced logging"
   ```

2. Push to repository:
   ```bash
   git push origin main
   ```

3. Deploy to Vercel:
   - Vercel should auto-deploy from the repository
   - Or manually trigger deployment from Vercel dashboard

4. Test production endpoint:
   ```bash
   API_BASE=https://your-production-url.vercel.app ./test-hooks-endpoint.sh
   ```

5. Verify frontend in production:
   - Navigate to the Hook Generator page
   - Generate hooks
   - Confirm no 405 errors
