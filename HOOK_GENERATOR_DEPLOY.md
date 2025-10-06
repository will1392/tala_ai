# Hook Generator Deployment Fix

## Issue
Hook Generator is not visible in production because the feature flag is missing.

## Solution
Add the feature flag to Vercel environment variables.

### Steps to Fix in Vercel Dashboard:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:
   - **Name**: `VITE_FEATURE_HOOK_GENERATOR`
   - **Value**: `true`
   - **Environment**: Production (and optionally Preview/Development)
4. Click **Save**
5. Go to **Deployments** tab
6. Click the **...** menu on the latest deployment
7. Select **Redeploy**
8. Check "Use existing build cache" is **unchecked**
9. Click **Redeploy**

### Alternative: Add to all environments at once
In the "Add New" form:
- Key: `VITE_FEATURE_HOOK_GENERATOR`
- Value: `true`
- Environments: Select all (Production, Preview, Development)

## Verification
After redeployment:
1. Visit your production URL
2. Log in
3. Check the sidebar - you should see "Hook Generator" with a Sparkles icon
4. Navigate to `/hooks` - you should see the Hook Generator interface

## Dev Environment White Screen Issue
The white screen in development is likely unrelated to the feature flag. To debug:

```bash
# Start dev server with console
npm run dev

# In browser, open DevTools Console (F12)
# Look for any React errors or warnings
```

Common causes:
- Missing dependencies
- Import errors
- React component errors

Check browser console for specific error messages.
