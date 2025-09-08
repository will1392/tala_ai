#!/bin/bash

# Start both frontend and backend for Tala

echo "🚀 Starting Tala AI System"
echo "========================="

# Function to cleanup on exit
cleanup() {
    echo -e "\n🛑 Shutting down Tala..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Start backend server
echo -e "\n1️⃣ Starting Backend Server..."
cd server
npm start &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! curl -s http://localhost:3001/api/health > /dev/null; then
    echo "❌ Backend failed to start!"
    echo "Check server/server.log for errors"
    exit 1
fi

echo "✅ Backend running on http://localhost:3001"

# Start frontend dev server
echo -e "\n2️⃣ Starting Frontend Dev Server..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo -e "\n✅ Tala is starting up!"
echo "📱 Frontend will be available at: http://localhost:5173"
echo "🔧 Backend API running at: http://localhost:3001"
echo -e "\n🛑 Press Ctrl+C to stop both servers\n"

# Wait for both processes
wait