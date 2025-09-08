#!/bin/bash

echo "🔍 Diagnosing Tala Connection Issues"
echo "===================================="

# Check if backend is running
echo -e "\n1️⃣ Checking Backend Server (Port 3001)..."
if lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ Something is running on port 3001"
    echo "Process:"
    lsof -i :3001
else
    echo "❌ Nothing running on port 3001"
    echo "   Backend server is NOT running"
fi

# Check if frontend is running
echo -e "\n2️⃣ Checking Frontend Server (Port 5173)..."
if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ Something is running on port 5173"
    echo "Process:"
    lsof -i :5173
else
    echo "❌ Nothing running on port 5173"
    echo "   Frontend dev server is NOT running"
fi

# Test backend health endpoint
echo -e "\n3️⃣ Testing Backend Health Endpoint..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
    curl -s http://localhost:3001/api/health | python3 -m json.tool | head -10
else
    echo "❌ Backend health check failed"
    echo "   Server is not responding properly"
fi

# Check for .env file
echo -e "\n4️⃣ Checking Backend Configuration..."
if [ -f "server/.env" ]; then
    echo "✅ .env file exists"
else
    echo "❌ .env file missing in server directory"
    echo "   Copy server/.env.example to server/.env"
fi

# Check for node_modules
echo -e "\n5️⃣ Checking Dependencies..."
if [ -d "server/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend dependencies missing"
    echo "   Run: cd server && npm install"
fi

if [ -d "node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies missing"
    echo "   Run: npm install"
fi

# Provide solution
echo -e "\n📋 SOLUTION:"
echo "============"

if ! lsof -i :3001 > /dev/null 2>&1; then
    echo "1. Start the backend server:"
    echo "   cd server && npm start"
fi

if ! lsof -i :5173 > /dev/null 2>&1; then
    echo -e "\n2. Start the frontend dev server:"
    echo "   npm run dev"
fi

echo -e "\nOr use the all-in-one script:"
echo "./start-tala.sh"