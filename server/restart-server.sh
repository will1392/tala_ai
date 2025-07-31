#!/bin/bash

echo "🛑 Stopping current server..."
# Kill the existing server process
pkill -f "node server.js" || echo "No server process found"

# Wait a moment
sleep 2

echo "🚀 Starting server..."
# Start the server
npm start