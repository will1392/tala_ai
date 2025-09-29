# 🚀 Tala AI Production Deployment Guide

This guide will walk you through deploying the chat and knowledge base features to production. We'll use Vercel for the frontend (free) and Railway for the backend (pay-as-you-go).

## 📋 Prerequisites

1. **Accounts needed (all free to start)**:
   - [Vercel Account](https://vercel.com/signup)
   - [Railway Account](https://railway.app/login)
   - GitHub account (you already have this)

2. **Required API Keys** (from your .env files):
   - Qdrant API key and URL
   - OpenAI API key
   - Supabase credentials
   - AWS S3 credentials (for file uploads)

## 🎯 Step 1: Prepare Your Code

### 1.1 Create Production Environment Files

Create `.env.production` in the root directory:
```env
VITE_API_URL=https://your-backend-url.railway.app
```

Create `server/.env.production`:
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-frontend.vercel.app

# Copy your working values from server/.env but use production versions
QDRANT_URL=your-qdrant-url
QDRANT_API_KEY=your-qdrant-api-key

OPENAI_API_KEY=sk-proj-your-key
# ... other API keys ...

# Use production database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# S3 for production files
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=tala-production

# Security - CHANGE THESE!
JWT_SECRET=generate-a-long-random-string-here
SESSION_SECRET=generate-another-long-random-string
```

### 1.2 Add Deployment Configuration

Create `vercel.json` in the root:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

Create `railway.json` in the root:
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "cd server && npm install && node server.js",
    "restartPolicyType": "always"
  }
}
```

### 1.3 Update API URL Configuration

Edit `src/services/apiSearchService.ts`:
```typescript
// Change line 15 from:
private baseUrl = '/api';

// To:
private baseUrl = import.meta.env.VITE_API_URL || '/api';
```

Do the same for any other files that have hardcoded API URLs.

## 🖥️ Step 2: Deploy Backend to Railway

### 2.1 Install Railway CLI
```bash
# On Mac
brew install railway

# On Windows/Linux
npm install -g @railway/cli
```

### 2.2 Deploy Backend
```bash
# Login to Railway
railway login

# In your project root
railway init

# Choose "Empty Project"
# Give it a name like "tala-ai-backend"

# Link and deploy
railway link
railway up
```

### 2.3 Configure Environment Variables in Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your project
3. Click "Variables" tab
4. Click "Raw Editor"
5. Paste ALL variables from `server/.env.production`
6. Click "Save"

### 2.4 Get Your Backend URL

1. In Railway dashboard, click "Settings"
2. Under "Domains", click "Generate Domain"
3. Copy the URL (like `https://tala-ai-backend.railway.app`)

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Update Frontend Configuration

Edit `.env.production`:
```env
VITE_API_URL=https://your-backend-url.railway.app/api
```
(Use the Railway URL from step 2.4)

### 3.2 Install Vercel CLI
```bash
npm i -g vercel
```

### 3.3 Deploy Frontend
```bash
# In your project root
vercel

# Answer the prompts:
# - Setup and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? tala-ai-frontend
# - Directory? ./
# - Override settings? No
```

### 3.4 Configure Production Deployment
```bash
# Deploy to production
vercel --prod
```

### 3.5 Update CORS in Backend

1. Go back to Railway dashboard
2. Update the `CORS_ORIGIN` variable to your Vercel URL
3. Railway will automatically redeploy

## 🔧 Step 4: Post-Deployment Setup

### 4.1 Test Your Deployment

1. **Visit your frontend URL** (from Vercel)
2. **Test login** - Use your existing credentials
3. **Test chat** - Send a message
4. **Test knowledge base** - Upload a small PDF
5. **Check console** for any errors (F12 in browser)

### 4.2 Setup Custom Domain (Optional)

**For Frontend (Vercel)**:
1. Go to Vercel dashboard
2. Click "Domains"
3. Add your domain
4. Update DNS records as instructed

**For Backend (Railway)**:
1. Go to Railway dashboard
2. Click "Settings" → "Domains"
3. Add custom domain
4. Update DNS

### 4.3 Enable HTTPS

- Vercel: Automatic
- Railway: Automatic

## 🚨 Troubleshooting Common Issues

### "CORS Error"
- Check `CORS_ORIGIN` in Railway matches your Vercel URL exactly
- Make sure to include `https://` in the URL

### "API Not Found"
- Verify `VITE_API_URL` in Vercel includes `/api` at the end
- Check Railway logs for startup errors

### "Upload Failed"
- Verify AWS S3 credentials in Railway
- Check S3 bucket permissions
- Ensure `STORAGE_TYPE=s3` is set

### "Database Connection Failed"
- Check Supabase credentials
- Verify Supabase project is not paused
- Check connection pooling limits

## 📊 Monitoring Your App

### Railway Logs
```bash
railway logs
```

### Vercel Logs
- Go to Vercel dashboard → Functions tab → Logs

### Health Check
```bash
curl https://your-backend.railway.app/api/health
```

## 💰 Cost Estimates

**Monthly costs for moderate usage**:
- Vercel: Free (up to 100GB bandwidth)
- Railway: ~$5-20 (pay for usage)
- Qdrant: Free tier or ~$25/month
- Supabase: Free tier or ~$25/month
- OpenAI: Usage-based (~$10-50)
- AWS S3: ~$1-5

**Total: ~$50-100/month**

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable rate limiting
- [ ] Use HTTPS everywhere
- [ ] Restrict CORS origins
- [ ] Secure API keys
- [ ] Enable Supabase RLS
- [ ] Set S3 bucket policies

## 🚀 Quick Deploy Script

Save as `deploy-production.sh`:
```bash
#!/bin/bash
echo "🚀 Deploying Tala AI to Production..."

# Deploy backend
echo "📦 Deploying backend to Railway..."
railway up

# Build and deploy frontend
echo "🎨 Deploying frontend to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "Frontend: https://tala-ai.vercel.app"
echo "Backend: Check Railway dashboard for URL"
```

## 📝 Next Steps

1. **Set up monitoring** with services like Sentry or LogRocket
2. **Configure backups** for your database
3. **Set up CI/CD** with GitHub Actions
4. **Add analytics** with Google Analytics or Plausible
5. **Implement caching** with Redis for better performance

## Need Help?

- Railway Discord: https://discord.gg/railway
- Vercel Discord: https://vercel.com/discord
- Create an issue in your GitHub repo

Remember to commit this guide to your repo for future reference!