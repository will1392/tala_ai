# Frontend Credit Display Test

## Current Status
Based on code investigation:

1. **Backend API is working correctly**
   - GET `/api/credits/balance` returns: `available_credits: 4947`
   - User has `super_admin` role with `has_unlimited_credits: true`
   - Recent transactions show `bypass_reason: "super_admin_unlimited_access"`

2. **Frontend code looks correct**
   - `useCredits` hook fetches from `/api/credits/balance`
   - Sidebar displays: `creditInfo?.available_credits || 0`
   - For super_admin, shows `'∞'` (infinity symbol)

3. **Expected behavior**
   - Sidebar should show: **"∞ (unlimited)"** for super_admin
   - Or show: **"4,947"** if unlimited flag isn't working

## Test Steps

### 1. Open Browser Console (Dev Tools)
```bash
# Open the app in browser
open http://localhost:5173/chat
```

### 2. Check Console Logs
Look for these log messages:
```
💳 Credits fetched: {
  userId: "59b70373...",
  credits: <should be 4947>,
  role: "super_admin",
  isSuperAdmin: true,
  hasUnlimited: true
}
```

### 3. Inspect Network Tab
- Filter by "balance"
- Check the response from `/api/credits/balance`
- Should show: `"available_credits": 4947`

### 4. Test localStorage
```javascript
// In browser console:
localStorage.getItem('userId')
// Should return: "59b70373-ba68-4d89-8420-5c3723aef01f"

localStorage.getItem('userRole')
// Should return: "super_admin"
```

### 5. Force Credit Refresh
```javascript
// In browser console:
window.dispatchEvent(new Event('creditUpdate'));
```

## Possible Issues

### Issue A: Caching
- The frontend might be caching an old value
- **Solution**: Clear browser cache and localStorage

### Issue B: Wrong User ID
- Frontend might be using a different userId
- **Solution**: Check localStorage.getItem('userId')

### Issue C: API Not Being Called
- Network requests might be blocked or failing
- **Solution**: Check Network tab for failed requests

### Issue D: Display Condition Not Met
- The `has_unlimited_credits` flag might not be reaching the component
- **Solution**: Add debug logs to Sidebar.tsx

## Quick Fix Commands

```bash
# Restart frontend (clear cache)
cd /Users/will/tala\ ai/tala_ai
npm run dev

# Clear user data in browser console
localStorage.clear()
sessionStorage.clear()
location.reload()
```

## Expected Console Output

### When credits are working:
```
💳 Credits fetched: {
  userId: "59b70373",
  credits: 4947,
  role: "super_admin",
  isSuperAdmin: true,
  hasUnlimited: true
}
```

### When user makes a chat query:
```
🎫 requireCredits middleware called: {
  operation: "chat_message",
  cost: 10,
  ...
}
✅ Credits check active
💳 Consuming credits after successful response: {
  userId: "59b70373...",
  operation: "chat_message",
  cost: 10,
  statusCode: 200
}
✅ Deducted 0 credits. User 59b70373... remaining: 4947
```

## Next Steps

1. Open browser and check console logs
2. Verify the logged credit value (should be 4947, not 20000)
3. If showing 20000, check localStorage for stale data
4. If showing correct value but display is wrong, inspect React component state
