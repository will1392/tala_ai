#!/bin/bash

echo "🔄 Restarting Tala AI with clean state..."

# Kill existing processes
echo "1️⃣ Stopping existing processes..."
pkill -f "node server.js" || true
pkill -f "vite" || true

# Clear logs
echo "2️⃣ Clearing logs..."
> server-new.log

# Start backend
echo "3️⃣ Starting backend server..."
cd /Users/will/tala\ ai/tala_ai/server
npm start > server-new.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "   Waiting for backend to initialize..."
sleep 5

# Clear all tasks
echo "4️⃣ Clearing all tasks..."
curl -X DELETE http://localhost:3001/api/tasks/admin/clear-all -H "x-mock-user-id: admin-1" > /dev/null 2>&1

# Start frontend
echo "5️⃣ Starting frontend..."
cd /Users/will/tala\ ai/tala_ai
npm run dev &
FRONTEND_PID=$!

echo "
✅ Tala AI is now running!

Backend PID: $BACKEND_PID (port 3001)
Frontend PID: $FRONTEND_PID (port 5173 or 5174)

To create tasks via chat, use messages like:
- 'create a task to call John'
- 'add task: Review the report'
- 'remind me to send the email tomorrow'

To stop: kill $BACKEND_PID $FRONTEND_PID
"