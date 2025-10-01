# Tala AI - Production Deployment Guide

This guide will walk you through deploying Tala to Vercel with a custom domain.

## 📋 Prerequisites

Before you begin, make sure you have:
1. ✅ A Vercel account (free at vercel.com)
2. ✅ A custom domain (purchased from providers like Namecheap, GoDaddy, etc.)
3. ✅ Git installed locally
4. ✅ GitHub account (to push code)

## 🎯 What We're Deploying

**Production Features:**
- ✅ Chat (AI Assistant)
- ✅ Knowledge Base (Document Management)
- ❌ Email (Hidden - In Development)
- ❌ CMO Mode (Hidden - In Development)
- ❌ Marketing Dashboard (Hidden - In Development)
- ❌ Settings (Hidden - In Development)

---

## Phase 1: Prepare Your Repository

### Step 1: Initialize Git (if not already done)

```bash
cd "/Users/will/tala ai/tala_ai"
git init
git add .
git commit -m "Initial commit - Tala AI production ready"
```

### Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `tala-ai` (or your preferred name)
3. Keep it **Private** (recommended for your proprietary code)
4. **DO NOT** initialize with README, .gitignore, or license
5. Click "Create repository"

### Step 3: Push to GitHub

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/tala-ai.git

# Push your code
git branch -M main
git push -u origin main
```

---

## Phase 2: Deploy Frontend to Vercel

### Step 1: Sign Up/Login to Vercel

1. Go to https://vercel.com
2. Click "Sign Up" (or "Login" if you have an account)
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub account

### Step 2: Import Your Project

1. From Vercel Dashboard, click **"Add New..." → "Project"**
2. Find your `tala-ai` repository in the list
3. Click **"Import"**

### Step 3: Configure Frontend Build Settings

In the configuration screen:

**Framework Preset:** Vite
**Root Directory:** `./` (leave as default)
**Build Command:** `npm run build`
**Output Directory:** `dist`
**Install Command:** `npm install`

### Step 4: Add Environment Variables

Click **"Environment Variables"** and add these:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://YOUR-BACKEND-URL.vercel.app/api` (we'll update this after backend deploy) |
| `VITE_ENV` | `production` |
| `VITE_FEATURE_DASHBOARD` | `true` |
| `VITE_FEATURE_CHAT` | `true` |
| `VITE_FEATURE_KNOWLEDGE` | `true` |
| `VITE_FEATURE_EMAIL` | `false` |
| `VITE_FEATURE_CMO` | `false` |
| `VITE_FEATURE_MARKETING` | `false` |
| `VITE_FEATURE_SETTINGS` | `false` |

**Note:** Leave `VITE_API_URL` as placeholder for now. We'll update it after deploying the backend.

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like: `https://tala-ai-xyz123.vercel.app`

---

## Phase 3: Deploy Backend to Vercel

### Step 1: Create New Project for Backend

1. Go back to Vercel Dashboard
2. Click **"Add New..." → "Project"**
3. Select the **same** GitHub repository
4. Click **"Import"**

### Step 2: Configure Backend Build Settings

**Framework Preset:** Other
**Root Directory:** `server` ← **IMPORTANT: Click "Edit" and set this!**
**Build Command:** Leave empty
**Output Directory:** Leave empty
**Install Command:** `npm install`

### Step 3: Add Backend Environment Variables

Add ALL these variables from your `server/.env` file:

**Critical Variables:**
```
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://YOUR-FRONTEND-URL.vercel.app

# Qdrant
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key

# Grok
GROK_API_KEY=your_grok_key

# Google Gemini
GOOGLE_AI_API_KEY=your_google_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket_name
STORAGE_TYPE=s3

# Multi-LLM
ENABLE_MULTI_LLM=true
```

**⚠️ IMPORTANT SECURITY NOTE:**
- Never commit `.env` files to Git
- Add `.env*` to your `.gitignore` (except `.env.example`)
- Only add environment variables through Vercel's dashboard

### Step 4: Deploy Backend

1. Click **"Deploy"**
2. Wait for deployment
3. Copy your backend URL: `https://tala-ai-server-xyz123.vercel.app`

---

## Phase 4: Connect Frontend to Backend

### Step 1: Update Frontend Environment Variables

1. Go to your **frontend** project in Vercel
2. Click **Settings → Environment Variables**
3. Find `VITE_API_URL`
4. Click "Edit"
5. Update value to: `https://YOUR-BACKEND-URL.vercel.app/api`
6. Click **Save**

### Step 2: Update Backend CORS

1. Go to your **backend** project in Vercel
2. Click **Settings → Environment Variables**
3. Find `CORS_ORIGIN`
4. Click "Edit"
5. Update value to: `https://YOUR-FRONTEND-URL.vercel.app`
6. Click **Save**

### Step 3: Redeploy Both Projects

1. Frontend: Go to **Deployments** → Click **"..."** on latest → **"Redeploy"**
2. Backend: Go to **Deployments** → Click **"..."** on latest → **"Redeploy"**

---

## Phase 5: Add Custom Domain

### Step 1: Add Domain to Vercel (Frontend)

1. Go to your **frontend** project in Vercel
2. Click **Settings → Domains**
3. Enter your domain: `yourdomain.com`
4. Click **Add**
5. Also add `www.yourdomain.com`

### Step 2: Configure DNS Records

Vercel will show you DNS records to add. Go to your domain provider (Namecheap, GoDaddy, etc.):

**For Root Domain (yourdomain.com):**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21` (Vercel's IP)

**For WWW Subdomain (www.yourdomain.com):**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`

**Common Domain Providers:**

**Namecheap:**
1. Login → Domain List → Manage
2. Advanced DNS → Add New Record

**GoDaddy:**
1. Login → My Products → DNS
2. Add Record

**Cloudflare:**
1. Login → Select Domain → DNS
2. Add Record

### Step 3: Wait for DNS Propagation

- DNS changes take 15 minutes to 48 hours
- Usually works within 1-2 hours
- Check status at: https://dnschecker.org

### Step 4: Enable HTTPS (Automatic)

Vercel automatically provisions SSL certificates. Once DNS is configured:
1. Your site will be available at `https://yourdomain.com`
2. Certificate usually ready within 5-10 minutes

---

## Phase 6: Testing Production Deployment

### Test Checklist:

1. ✅ Visit `https://yourdomain.com`
2. ✅ Verify logo displays correctly
3. ✅ Test Chat functionality
4. ✅ Upload a document to Knowledge Base
5. ✅ Search for documents
6. ✅ Ask chat a question about uploaded document
7. ✅ Toggle light/dark mode
8. ✅ Verify Email, CMO, and Settings are hidden

### If Something Doesn't Work:

**Frontend Issues:**
```bash
# Check build logs
Vercel Dashboard → Your Frontend Project → Deployments → Latest → View Logs
```

**Backend Issues:**
```bash
# Check function logs
Vercel Dashboard → Your Backend Project → Deployments → Latest → View Function Logs
```

**Common Issues:**

1. **Chat not working:**
   - Verify `VITE_API_URL` points to backend
   - Check backend `CORS_ORIGIN` includes frontend URL
   - Verify all API keys are set in backend environment

2. **Knowledge Base uploads failing:**
   - Verify AWS S3 credentials
   - Check `STORAGE_TYPE=s3`
   - Verify bucket permissions

3. **Blank screen:**
   - Check browser console (F12)
   - Verify `VITE_ENV=production`
   - Check build logs for errors

---

## Phase 7: Monitoring & Maintenance

### Monitor Deployments

**Vercel Dashboard:**
- View real-time logs
- Monitor function execution
- Track bandwidth usage

**Set Up Alerts:**
1. Vercel Dashboard → Settings → Notifications
2. Enable "Deployment Failed" alerts
3. Add your email

### Update Production

When you make changes:

```bash
# Make your changes locally
git add .
git commit -m "Description of changes"
git push origin main
```

Vercel automatically deploys on every push to `main` branch!

---

## 🔒 Security Best Practices

1. ✅ Never commit API keys to Git
2. ✅ Use environment variables for all secrets
3. ✅ Keep repository private
4. ✅ Enable Vercel Password Protection (optional)
5. ✅ Regularly rotate API keys
6. ✅ Monitor Vercel logs for suspicious activity

---

## 💰 Vercel Pricing

**Free Tier Includes:**
- 100GB bandwidth/month
- Unlimited deployments
- Custom domains
- SSL certificates
- Analytics

**You'll need Pro ($20/month) if:**
- You exceed bandwidth limits
- You need team collaboration
- You want advanced analytics

Start with Free tier and upgrade only if needed!

---

## 📞 Support Resources

**Vercel Documentation:**
- https://vercel.com/docs

**Vercel Community:**
- https://github.com/vercel/vercel/discussions

**Need Help?**
- Check Vercel's deployment logs first
- Search Vercel docs for error messages
- Ask in Vercel's Discord community

---

## ✅ Quick Reference Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]

# Pull environment variables
vercel env pull

# Deploy manually (if needed)
vercel --prod
```

---

## 🎉 You're Done!

Your production deployment checklist:
- ✅ Code pushed to GitHub
- ✅ Frontend deployed to Vercel
- ✅ Backend deployed to Vercel
- ✅ Custom domain configured
- ✅ SSL certificate active
- ✅ Only Chat & Knowledge Base visible
- ✅ Testing completed

Your users can now access Tala at: **https://yourdomain.com**

---

**Next Steps:**
- Continue developing Email, CMO, and Marketing features locally
- When ready, update feature flags in Vercel and redeploy
- Monitor usage and performance
- Collect user feedback

Good luck with your launch! 🚀
