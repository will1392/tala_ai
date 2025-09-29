# 🚀 Production Deployment Checklist

Use this checklist before deploying to production.

## 🔐 Environment Variables

### Frontend (.env.production)
- [ ] Create `.env.production` in root directory
- [ ] Set `VITE_API_URL` to your backend URL (will get from Railway)

### Backend (server/.env.production)
- [ ] Create `server/.env.production` 
- [ ] Copy all values from `server/.env`
- [ ] Update with production values:
  - [ ] `NODE_ENV=production`
  - [ ] `CORS_ORIGIN=` (will get from Vercel)
  - [ ] Generate new `JWT_SECRET` (use: `openssl rand -base64 32`)
  - [ ] Generate new `SESSION_SECRET` (use: `openssl rand -base64 32`)

## 📦 Pre-Deployment Steps

- [ ] Commit all changes to GitHub
- [ ] Test locally with production build:
  ```bash
  npm run build
  npm run preview
  ```
- [ ] Verify no console errors
- [ ] Test critical features:
  - [ ] Login works
  - [ ] Chat messages send/receive
  - [ ] Document upload works
  - [ ] Knowledge base search works

## 🚀 Deployment Steps

### 1. Deploy Backend First
- [ ] Run `railway login`
- [ ] Run `railway init` (create new project)
- [ ] Run `railway up`
- [ ] Copy the backend URL from Railway dashboard
- [ ] Add ALL environment variables in Railway dashboard

### 2. Update Frontend Config
- [ ] Update `.env.production` with Railway backend URL
- [ ] Commit the change

### 3. Deploy Frontend
- [ ] Run `vercel`
- [ ] Choose production deployment
- [ ] Copy the frontend URL from Vercel

### 4. Update Backend CORS
- [ ] Go to Railway dashboard
- [ ] Update `CORS_ORIGIN` with Vercel URL
- [ ] Railway auto-redeploys

## ✅ Post-Deployment Verification

- [ ] Frontend loads without errors
- [ ] Can log in successfully
- [ ] Chat functionality works
- [ ] Document upload succeeds
- [ ] Knowledge base search returns results
- [ ] No CORS errors in console
- [ ] No 404 errors for API calls

## 🔍 Quick Debug Commands

```bash
# Check backend logs
railway logs

# Check frontend deployment
vercel logs

# Test backend health
curl https://your-backend.railway.app/api/health

# Test from frontend
# Open browser console and run:
fetch('https://your-backend.railway.app/api/health').then(r => r.json()).then(console.log)
```

## 🚨 Common Issues & Fixes

### CORS Error
```
Fix: Ensure CORS_ORIGIN in Railway exactly matches Vercel URL (including https://)
```

### 502 Bad Gateway
```
Fix: Check Railway logs for startup errors, usually missing env variables
```

### File Upload Fails
```
Fix: Verify AWS S3 credentials and STORAGE_TYPE=s3 in Railway
```

### Database Connection Error
```
Fix: Check Supabase is not paused, verify credentials
```

## 📞 Emergency Rollback

If something goes wrong:

1. **Vercel**: Go to dashboard → Deployments → Click "..." → Redeploy previous version
2. **Railway**: Go to dashboard → Deployments → Rollback to previous

## 🎯 Final Steps

- [ ] Share the production URL with your team
- [ ] Set up monitoring (optional)
- [ ] Configure custom domain (optional)
- [ ] Celebrate! 🎉

---

Remember: Take your time, test each step, and don't hesitate to check logs if something doesn't work!