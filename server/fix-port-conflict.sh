#!/bin/bash

echo "🔍 Finding and killing process on port 3001..."

# Find the process using port 3001
PID=$(lsof -ti:3001)

if [ -z "$PID" ]; then
    echo "✅ No process found on port 3001"
else
    echo "Found process $PID using port 3001"
    echo "Killing process..."
    kill -9 $PID
    echo "✅ Process killed"
fi

echo ""
echo "🚀 Port 3001 is now free!"
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Wait for: '✅ Intelligent chat system ready'"
echo "3. Look for: '🚀 intelligentChat.js loaded - VERSION: Simple flow for ALL travel queries'"
echo "4. Test with: node verify-after-restart.js"