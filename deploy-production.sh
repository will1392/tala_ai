#!/bin/bash
# Production Deployment Script for Tala AI

set -e  # Exit on error

echo "🚀 Starting Tala AI Production Deployment..."
echo "============================================"

# Check if required tools are installed
check_requirements() {
    echo "🔍 Checking requirements..."
    
    if ! command -v railway &> /dev/null; then
        echo "❌ Railway CLI not found. Install with: brew install railway"
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
        exit 1
    fi
    
    echo "✅ All requirements satisfied"
}

# Build frontend
build_frontend() {
    echo ""
    echo "🏗️  Building frontend..."
    npm install
    npm run build
    echo "✅ Frontend built successfully"
}

# Deploy backend to Railway
deploy_backend() {
    echo ""
    echo "🚂 Deploying backend to Railway..."
    railway up
    echo "✅ Backend deployed to Railway"
    echo "📝 Remember to set environment variables in Railway dashboard!"
}

# Deploy frontend to Vercel
deploy_frontend() {
    echo ""
    echo "▲ Deploying frontend to Vercel..."
    vercel --prod
    echo "✅ Frontend deployed to Vercel"
}

# Main deployment flow
main() {
    check_requirements
    
    echo ""
    echo "📋 Deployment Steps:"
    echo "1. Build frontend"
    echo "2. Deploy backend to Railway"
    echo "3. Deploy frontend to Vercel"
    echo ""
    
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
    
    build_frontend
    deploy_backend
    deploy_frontend
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "============================================"
    echo "📌 Next Steps:"
    echo "1. Set environment variables in Railway dashboard"
    echo "2. Update CORS_ORIGIN in Railway to match Vercel URL"
    echo "3. Test all features on production"
    echo "4. Monitor logs for any errors"
    echo ""
    echo "📊 View deployments:"
    echo "- Railway: https://railway.app/dashboard"
    echo "- Vercel: https://vercel.com/dashboard"
}

# Run main function
main