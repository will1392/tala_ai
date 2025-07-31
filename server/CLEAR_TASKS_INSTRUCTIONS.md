# How to Clear All Tasks from the Dashboard

## Problem
The dashboard is showing mock/test tasks that were created during development.

## Solution

### Method 1: Via Admin Endpoint (Recommended)
After restarting the server with the latest changes:

```bash
# Clear all tasks
curl -X DELETE http://localhost:3001/api/tasks/admin/clear-all \
  -H "x-mock-user-id: admin-1"

# Or run the provided script
node clear-all-tasks-admin.js
```

### Method 2: Manual Deletion
Run the script to delete tasks one by one:

```bash
node inspect-and-clear-tasks.js
```

Note: This method may require server restart to take effect due to mock database caching.

### Method 3: Direct Database Clear
1. Stop the server (Ctrl+C)
2. Run: `node force-clear-all-tasks.js`
3. Restart the server

## Prevention
To prevent mock data from appearing:
- The system now uses real task creation via chat
- No mock data is automatically created
- Tasks are only created when users explicitly request them

## Verification
After clearing tasks, verify by:
1. Checking the dashboard - should show no tasks
2. Running: `curl http://localhost:3001/api/tasks -H "x-mock-user-id: test_user_123"`
3. Response should show `"tasks": []`

## Creating New Tasks
Use the chat interface to create real tasks:
- "Create a task to book flights"
- "Add task: Review passport expiry"
- "Create task Check visa requirements with high priority"