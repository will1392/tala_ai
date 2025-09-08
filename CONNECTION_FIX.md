# Fixing Connection Issues

## The Problem
Your frontend (running on port 5173) can't connect to the backend (should be on port 3001):
- `ERR_CONNECTION_REFUSED` - Backend server is not running
- Frontend is trying to reach the backend but it's not there

## Quick Fix - Start Both Servers

### Option 1: Use the startup script (Easiest)
```bash
cd "/Users/will/tala ai/tala_ai"
./start-tala.sh
```
This will start both frontend and backend together.

### Option 2: Start them manually in separate terminals

**Terminal 1 - Backend:**
```bash
cd "/Users/will/tala ai/tala_ai/server"
npm start
```
Wait until you see: `✅ Server is running on http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd "/Users/will/tala ai/tala_ai"
npm run dev
```

## Verify Everything is Working

1. **Check Backend Health:**
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return JSON with status "healthy"

2. **Check Frontend:**
   Open http://localhost:5173 in your browser

## Common Issues

### If backend won't start:
1. Check for errors:
   ```bash
   cd server
   cat server.log
   ```

2. Check environment variables:
   ```bash
   cd server
   ls -la .env
   ```
   Make sure `.env` file exists

3. Kill any stuck processes:
   ```bash
   pkill -f "node.*server.js"
   ```

### If "Cannot find module" errors:
```bash
cd server
npm install
```

## The Architecture

```
Browser (localhost:5173)
    ↓
Vite Dev Server (Frontend)
    ↓ (proxies /api/* requests)
Backend Server (localhost:3001)
    ↓
Database / AI Services
```

## Testing the Chat

Once both servers are running:
1. Go to http://localhost:5173
2. Select Marketing mode
3. Type: "Can you help with a postcard campaign?"
4. Should get a response asking what you want to accomplish

## What the Errors Mean

- `net::ERR_CONNECTION_REFUSED` = Server not running
- `500 Internal Server Error` = Server crashed or has an error
- `Failed to fetch` = Can't reach the server

Run `./start-tala.sh` and both servers will start together!