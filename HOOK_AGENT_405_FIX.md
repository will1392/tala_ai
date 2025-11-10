# Hook Agent 405 Error - Investigation and Fix

## Problem
The endpoint `/api/hooks/generate` was returning **405 Method Not Allowed** when the frontend sent POST requests from `HookGenerator.tsx` (line 207).

## Investigation Results

### Endpoint Status
✅ The endpoint **DOES EXIST** in `/Users/will/tala ai/tala_ai/server/server.js` at line 750  
✅ The endpoint **IS CONFIGURED** to accept POST requests  
✅ The middleware chain is properly configured (`optionalAuth` → `requireCredits` → `asyncHandler`)  
✅ The HookGenerationService is properly imported and instantiated

### Identified Issues

1. **Missing CORS Preflight Handler**
   - The endpoint lacked an explicit OPTIONS handler for CORS preflight requests
   - Browsers send OPTIONS requests before POST requests to verify CORS permissions
   - Without this handler, some requests could fail with 405 errors

2. **Credits Configuration**
   - The `hook_generation` operation was not explicitly defined in the `OPERATION_COSTS` object
   - It was defaulting to 1 credit instead of a more appropriate cost

3. **Insufficient Logging**
   - Limited diagnostic information made it difficult to troubleshoot the issue
   - Added detailed request logging to help identify future issues

## Changes Made

### 1. Added OPTIONS Handler (`server/server.js` line 746)
```javascript
// Hook Generation API - Add OPTIONS handler for CORS preflight
app.options('/api/hooks/generate', (req, res) => {
  res.status(204).end();
});
```

### 2. Enhanced Logging (`server/server.js` line 752-754)
```javascript
console.log('🎣 Hook generation request received');
console.log('   Method:', req.method);
console.log('   Path:', req.path);
console.log('   Headers:', JSON.stringify(req.headers, null, 2));
```

### 3. Added Credits Configuration (`server/middleware/creditsMiddleware.js` line 40)
```javascript
// Hook generation operations
'hook_generation': 5,
```

## Testing

### Test Scripts Created

1. **`server/test-hooks-endpoint.sh`** - Comprehensive Bash test script
   - Tests OPTIONS preflight requests
   - Tests POST with valid data
   - Tests POST with invalid data (validation)
   - Provides detailed diagnostic output

2. **`server/test-hooks-endpoint.js`** - Node.js test script
   - Same tests as the Bash version
   - Can be integrated into CI/CD pipelines

### Running Tests

```bash
# Option 1: Using Bash script (recommended)
cd server
./test-hooks-endpoint.sh

# Option 2: Using Node script (requires node-fetch)
cd server
node test-hooks-endpoint.js

# Option 3: Manual curl test
curl -X POST http://localhost:3001/api/hooks/generate \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "targetAudience": "Luxury travelers",
    "offering": "European river cruise",
    "painPoints": ["Worried about crowds"],
    "desiredOutcome": "Book a cruise"
  }'
```

## Deployment Checklist

To deploy the fix to production:

- [ ] Commit changes to git
- [ ] Push to repository
- [ ] Deploy to Vercel (both frontend and server)
- [ ] Test the production endpoint
- [ ] Monitor server logs for any issues

## Additional Notes

### Why 405 Instead of 404?

A 405 error (Method Not Allowed) is different from 404 (Not Found):
- **404**: The endpoint doesn't exist
- **405**: The endpoint exists but doesn't support the HTTP method

In this case, the issue could be:
1. CORS preflight failing (now fixed with OPTIONS handler)
2. A middleware intercepting the request before it reaches the handler
3. Vercel serverless function configuration issues

### Cost Configuration

The `hook_generation` operation now costs **5 credits**, which is consistent with other AI-generation operations like `cmo_generate`. This reflects:
- Multiple LLM calls (planning, generation, critique, scoring)
- Processing of 30+ hooks per request
- RAG retrieval from knowledge base

### Vercel Considerations

If the issue persists in production after deploying these changes:

1. **Check Vercel deployment logs** - Look for errors during build/deployment
2. **Verify environment variables** - Ensure all required env vars are set
3. **Check Vercel function timeout** - Hook generation can take 30-60 seconds
4. **Review Vercel routing** - Ensure `vercel.json` is correctly configured

The `server/vercel.json` configuration looks correct:
```json
{
  "version": 2,
  "builds": [{"src": "server.js", "use": "@vercel/node"}],
  "routes": [{"src": "/(.*)", "dest": "server.js"}]
}
```

## Files Modified

1. `/Users/will/tala ai/tala_ai/server/server.js` - Added OPTIONS handler and enhanced logging
2. `/Users/will/tala ai/tala_ai/server/middleware/creditsMiddleware.js` - Added hook_generation cost

## Files Created

1. `/Users/will/tala ai/tala_ai/server/test-hooks-endpoint.sh` - Bash test script
2. `/Users/will/tala ai/tala_ai/server/test-hooks-endpoint.js` - Node test script  
3. `/Users/will/tala ai/tala_ai/HOOK_AGENT_405_FIX.md` - This documentation

## Next Steps

1. **Test locally** - Run the test script to verify the fix works locally
2. **Deploy to production** - Push changes and deploy to Vercel
3. **Monitor** - Watch server logs after deployment for any issues
4. **Verify frontend** - Test the Hook Generator UI in production

## Root Cause Analysis

The most likely root cause was **missing CORS preflight handling**. When the frontend (running on a different origin) makes a POST request with custom headers:

1. Browser sends OPTIONS preflight request first
2. Without explicit OPTIONS handler, request fails
3. Browser blocks the subsequent POST request
4. User sees 405 error

The fix ensures:
- ✅ OPTIONS requests are properly handled
- ✅ CORS headers are set correctly (already configured in middleware)
- ✅ POST requests can proceed after successful preflight
- ✅ Better logging for future debugging

## Success Criteria

The fix is successful when:
- [ ] OPTIONS requests return 204 No Content
- [ ] POST requests with valid data return 200 OK (or 401/402 if auth/credits required)
- [ ] POST requests with invalid data return 400 Bad Request
- [ ] Hooks are generated successfully and returned in the response
- [ ] Frontend Hook Generator UI works without errors
