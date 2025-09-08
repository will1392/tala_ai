#!/bin/bash

# Start server with proper error handling
echo "🚀 Starting Tala server..."

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Start the server
echo "✅ Starting server on port 3001..."
npm start