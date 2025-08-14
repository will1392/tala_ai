# Conversation Persistence Debug Guide

## How to Test Conversation Switching

### 1. Open Browser Console (F12)

### 2. Send a Test Message
- Type "Hello" and send
- You should see in console:
  ```
  Sending message with conversationId: conv-xxxx
  Saved 2 messages to localStorage for conv-xxxx
  ```

### 3. Check localStorage
In browser console, run:
```javascript
// See all conversation data
Object.keys(localStorage).filter(k => k.includes('tala')).forEach(k => {
  console.log(k, JSON.parse(localStorage[k]));
});
```

### 4. Send Another Message
- Type "Tell me about Greece" and send
- Check that messages are being saved

### 5. Refresh the Page
- After refresh, messages should reload
- You should see the conversation in the sidebar

### 6. Click on a Conversation
- Click a conversation in sidebar
- Console should show:
  ```
  Loading messages for conversation conv-xxxx
  Loaded conversation from cache
  ```

## What's Fixed

1. **Added GET /api/conversations endpoint** - Lists all conversations
2. **Added GET /api/conversations/:id/messages endpoint** - Gets messages for a conversation
3. **LocalStorage persistence** - Messages saved automatically
4. **Conversation switching** - Loads messages when clicking conversations
5. **Auto-save on unmount** - Saves messages when leaving page

## How It Works

### Message Flow
1. User sends message → Creates/uses conversationId
2. Message saved to localStorage immediately
3. Response received → Saved to localStorage
4. Conversation metadata updated

### Loading Flow
1. Click conversation → Save current messages
2. Switch conversationId → Trigger useEffect
3. Try backend API → If fails, use localStorage
4. Display messages

### Storage Keys
- `tala_current_conversation` - Current conversation metadata
- `tala_conversations_admin-1` - List of all conversations
- `tala_messages_conv-xxxx` - Messages for each conversation

## Troubleshooting

### Messages Not Loading
1. Check localStorage has messages:
   ```javascript
   localStorage.getItem('tala_messages_' + conversationId)
   ```

2. Check conversation list:
   ```javascript
   JSON.parse(localStorage.getItem('tala_conversations_admin-1'))
   ```

### Conversations Not Showing
1. Send a message first to create a conversation
2. Check console for errors
3. Verify localStorage has conversation list

### Backend Connection Issues
- The system works offline using localStorage
- Backend is optional for persistence
- 404 errors are handled gracefully

## Manual Reset
To clear all conversation data:
```javascript
Object.keys(localStorage)
  .filter(k => k.includes('tala'))
  .forEach(k => localStorage.removeItem(k));
location.reload();
```